import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { ZodError, z } from "zod";
import { HttpError } from "../../../shared/http-error.js";
import { AuthService } from "../../auth/application/auth-service.js";
import { EventService } from "../../events/application/event-service.js";
import { ListingService } from "../application/listing-service.js";
import { assertTrustedSeller, isTopTrustedSeller } from "../../../shared/trusted-seller.js";

const createListingSchema = z.object({
  eventId: z.string().min(1).optional(),
  eventTitle: z.string().trim().min(2).max(160).optional(),
  eventArtist: z.string().trim().max(120).optional(),
  eventVenue: z.string().trim().max(120).optional(),
  eventCity: z.string().trim().max(80),
  eventStartAt: z.string().datetime().optional(),
  eventImageUrl: z.string().max(2_500_000).optional(),
  title: z.string().trim().min(2).max(120).optional(),
  seatType: z.enum(["GA", "VIP", "OTHER"]),
  priceCents: z.number().int().min(100),
  quantity: z.number().int().min(1).max(20),
  notes: z.string().trim().max(600).optional()
}).superRefine((value, context) => {
  if (value.eventStartAt && new Date(value.eventStartAt).getTime() < Date.now()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Event date must be in the future.",
      path: ["eventStartAt"]
    });
  }
  if (!value.eventId) {
    if (!value.eventTitle) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select an existing event or enter a new event title.",
        path: ["eventTitle"]
      });
    }
    if (!value.eventVenue?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Venue is required.",
        path: ["eventVenue"]
      });
    }
    if (!value.eventCity?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "City is required.",
        path: ["eventCity"]
      });
    }
    if (!value.eventStartAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Event date and time are required.",
        path: ["eventStartAt"]
      });
    }
  }
});

const purchaseSchema = z.object({
  quantity: z.number().int().min(1).max(10),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(24)
    .refine(
      (value) => /^\+?[\d\s().-]+$/.test(value) && value.replace(/\D/g, "").length >= 7,
      { message: "Enter a valid phone number so the seller can contact you." }
    )
});

const updateRequestStatusSchema = z.object({
  status: z.enum(["contacted", "cancelled"])
});

const updateListingSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    seatType: z.enum(["GA", "VIP", "OTHER"]).optional(),
    priceCents: z.number().int().min(100).optional(),
    quantity: z.number().int().min(1).max(20).optional(),
    eventImageUrl: z.string().max(2_500_000).optional(),
    notes: z.string().trim().max(600).optional(),
    soldOut: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one listing field to update."
  });

function extractBearerToken(authorizationHeader?: string): string {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing Bearer token.");
  }

  return authorizationHeader.substring("Bearer ".length);
}

export function createListingRoutes(
  listingService: ListingService,
  authService: AuthService,
  eventService: EventService
): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const eventId =
        typeof req.query.eventId === "string" && req.query.eventId.length > 0
          ? req.query.eventId
          : undefined;
      const listings = await listingService.listListings({ eventId });
      res.status(200).json({ listings });
    } catch (error) {
      next(error);
    }
  });

  router.get("/mine", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      const listings = await listingService.listListings({
        sellerId: user.id,
        includeSoldOut: true
      });
      res.status(200).json({ listings });
    } catch (error) {
      next(error);
    }
  });

  router.get("/market", async (req, res, next) => {
    try {
      const query = typeof req.query.q === "string" ? req.query.q : undefined;
      const artist = typeof req.query.artist === "string" ? req.query.artist : undefined;
      const city = typeof req.query.city === "string" ? req.query.city : undefined;
      const limit =
        typeof req.query.limit === "string" && Number.isFinite(Number(req.query.limit))
          ? Number(req.query.limit)
          : undefined;
      const events = await listingService.listMarketEventSuggestions({ query, artist, city, limit });
      res.status(200).json({ events });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:listingId", async (req, res, next) => {
    try {
      const listing = await listingService.getListingById(req.params.listingId);
      res.status(200).json({ listing });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      assertTrustedSeller(user.email);
      const input = createListingSchema.parse(req.body);
      const listing = await listingService.createListing({
        sellerId: user.id,
        eventId: input.eventId,
        eventTitle: input.eventTitle,
        eventArtist: input.eventArtist,
        eventVenue: input.eventVenue,
        eventCity: input.eventCity,
        eventStartAt: input.eventStartAt,
        eventImageUrl: input.eventImageUrl,
        title: input.title,
        seatType: input.seatType,
        priceCents: input.priceCents,
        quantity: input.quantity,
        notes: input.notes
      });
      res.status(201).json({ listing });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:listingId/purchase", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      const input = purchaseSchema.parse(req.body);
      const result = await listingService.purchaseListing({
        listingId: req.params.listingId,
        buyerId: user.id,
        quantity: input.quantity,
        buyerPhone: input.phone
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/requests/:requestId", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      const input = updateRequestStatusSchema.parse(req.body);
      const result = await listingService.updatePurchaseRequestStatus({
        requestId: req.params.requestId,
        userId: user.id,
        status: input.status
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:listingId", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      const listing = await listingService.getListingById(req.params.listingId);
      const canEdit = listing.sellerId === user.id || isTopTrustedSeller(user.email);
      if (!canEdit) {
        throw new HttpError(
          403,
          "Only the listing owner or one of the top 3 trusted sellers can edit listings."
        );
      }

      const input = updateListingSchema.parse(req.body);
      // The image belongs to the shared event, so it follows event edit rules, and it's applied
      // first so an invalid image can't leave the listing half-updated behind a 400.
      if (input.eventImageUrl !== undefined) {
        const event = await eventService.getEventById(listing.eventId);
        if (event.organizerId !== user.id && !isTopTrustedSeller(user.email)) {
          throw new HttpError(
            403,
            "Only the event organizer or a top trusted seller can change this event's image."
          );
        }
        await eventService.updateEvent({
          eventId: listing.eventId,
          imageUrl: input.eventImageUrl
        });
      }
      const updated = await listingService.updateListing({
        listingId: req.params.listingId,
        title: input.title,
        seatType: input.seatType,
        priceCents: input.priceCents,
        quantity: input.quantity,
        notes: input.notes,
        soldOut: input.soldOut
      });
      res.status(200).json({ listing: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:listingId", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      const listing = await listingService.getListingById(req.params.listingId);
      if (listing.sellerId !== user.id) {
        throw new HttpError(403, "Only the listing owner can delete this listing.");
      }

      await listingService.deleteListing(req.params.listingId);
      res.status(200).json({ message: "Listing deleted." });
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
