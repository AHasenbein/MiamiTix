import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { ZodError, z } from "zod";
import { HttpError } from "../../../shared/http-error.js";
import { AuthService } from "../../auth/application/auth-service.js";
import { EventService } from "../application/event-service.js";
import type { FeaturedEventRepository } from "../domain/featured-event-repository.js";
import { ListingService } from "../../listings/application/listing-service.js";
import { getMongoDb } from "../../../database/mongo.js";
import { uploadEventImageData } from "../../../shared/cloudinary-uploader.js";
import {
  assertPrimaryTrustedSeller,
  assertTrustedSeller,
  isTopTrustedSeller
} from "../../../shared/trusted-seller.js";

const createEventSchema = z.object({
  title: z.string().trim().min(2).max(120),
  artists: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
  venue: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80),
  startAt: z.string().datetime(),
  imageUrl: z.string().max(2_500_000).optional(),
  description: z.string().trim().max(600).optional()
});

const updateEventSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    artists: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
    venue: z.string().trim().max(120).optional(),
    city: z.string().trim().min(2).max(80).optional(),
    startAt: z.string().datetime().optional(),
    imageUrl: z.string().max(2_500_000).optional(),
    description: z.string().trim().max(600).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one event field to update."
  });

const setFeaturedEventSchema = z.object({
  eventId: z.string().min(1).nullable()
});

const uploadEventImageSchema = z.object({
  imageDataUrl: z.string().min(1).max(2_500_000)
});

function extractBearerToken(authorizationHeader?: string): string {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing Bearer token.");
  }

  return authorizationHeader.substring("Bearer ".length);
}

export function createEventRoutes(
  eventService: EventService,
  authService: AuthService,
  listingService: ListingService,
  featuredEventRepository: FeaturedEventRepository
): Router {
  const router = Router();

  router.get("/artists", async (req, res, next) => {
    try {
      const query = typeof req.query.q === "string" ? req.query.q : undefined;
      const limit =
        typeof req.query.limit === "string" && Number.isFinite(Number(req.query.limit))
          ? Number(req.query.limit)
          : undefined;
      const artists = await eventService.listArtistSuggestions({ query, limit });
      res.status(200).json({ artists });
    } catch (error) {
      next(error);
    }
  });

  router.get("/", async (req, res, next) => {
    try {
      const query = typeof req.query.q === "string" ? req.query.q : undefined;
      const city = typeof req.query.city === "string" ? req.query.city : undefined;
      const limit =
        typeof req.query.limit === "string" && Number.isFinite(Number(req.query.limit))
          ? Number(req.query.limit)
          : undefined;
      const activeListings = await listingService.listListings({});
      const activeEventIds = Array.from(new Set(activeListings.map((listing) => listing.eventId)));
      const events = await eventService.listEvents({
        upcomingOnly: true,
        query,
        city,
        limit,
        ids: activeEventIds
      });
      res.status(200).json({ events });
    } catch (error) {
      next(error);
    }
  });

  // Event of the Month. Public read; only the primary trusted seller (admin) can change it.
  // Registered before "/:eventId" so "featured" isn't treated as an id.
  router.get("/featured", async (_req, res, next) => {
    try {
      const selection = await featuredEventRepository.get();
      if (!selection) {
        res.status(200).json({ event: null });
        return;
      }
      const event = await eventService.getEventById(selection.eventId).catch((error: unknown) => {
        if (error instanceof HttpError && error.statusCode === 404) return null;
        throw error;
      });
      // A pick that has been deleted or has already happened stops showing on its own.
      const isUpcoming = event ? new Date(event.startAt).getTime() > Date.now() : false;
      res.status(200).json({ event: isUpcoming ? event : null });
    } catch (error) {
      next(error);
    }
  });

  router.put("/featured", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      assertPrimaryTrustedSeller(user.email, "Only the admin account can choose the event of the month.");
      const input = setFeaturedEventSchema.parse(req.body);

      if (input.eventId === null) {
        await featuredEventRepository.clear();
        res.status(200).json({ event: null });
        return;
      }

      const event = await eventService.getEventById(input.eventId);
      await featuredEventRepository.set({
        eventId: event.id,
        selectedBy: user.id,
        selectedAt: new Date()
      });
      res.status(200).json({ event });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:eventId", async (req, res, next) => {
    try {
      const event = await eventService.getEventById(req.params.eventId);
      res.status(200).json({ event });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      assertTrustedSeller(user.email);
      const input = createEventSchema.parse(req.body);

      const event = await eventService.createEvent({
        organizerId: user.id,
        title: input.title,
        artists: input.artists,
        venue: input.venue,
        city: input.city,
        startAt: input.startAt,
        imageUrl: input.imageUrl,
        description: input.description
      });
      res.status(201).json({ event });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:eventId", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      const existingEvent = await eventService.getEventById(req.params.eventId);
      const canEdit = existingEvent.organizerId === user.id || isTopTrustedSeller(user.email);
      if (!canEdit) {
        throw new HttpError(
          403,
          "Only the event organizer or one of the top 3 trusted sellers can edit events."
        );
      }

      const input = updateEventSchema.parse(req.body);
      const event = await eventService.updateEvent({
        eventId: req.params.eventId,
        title: input.title,
        artists: input.artists,
        venue: input.venue,
        city: input.city,
        startAt: input.startAt,
        imageUrl: input.imageUrl,
        description: input.description
      });
      res.status(200).json({ event });
    } catch (error) {
      next(error);
    }
  });

  router.post("/upload-image", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      assertTrustedSeller(user.email);
      const input = uploadEventImageSchema.parse(req.body);
      const imageUrl = await uploadEventImageData(input.imageDataUrl);
      res.status(201).json({ imageUrl });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/admin/all", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      assertPrimaryTrustedSeller(user.email);

      const db = await getMongoDb();
      const [eventsResult, listingsResult, purchasesResult, wishlistsResult, requestsResult] = await Promise.all([
        db.collection("events").deleteMany({}),
        db.collection("listings").deleteMany({}),
        db.collection("purchases").deleteMany({}),
        db.collection("wishlists").deleteMany({}),
        db.collection("purchase_requests").deleteMany({})
      ]);

      res.status(200).json({
        message: "All events and related marketplace data were deleted.",
        deleted: {
          events: eventsResult.deletedCount,
          listings: listingsResult.deletedCount,
          purchases: purchasesResult.deletedCount,
          wishlists: wishlistsResult.deletedCount,
          purchaseRequests: requestsResult.deletedCount
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: "Invalid request body.",
        issues: error.issues
      });
      return;
    }

    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    next(error);
  });

  return router;
}
