import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { ZodError, z } from "zod";
import { AuthService } from "../application/auth-service.js";
import { OAuthProviderRegistry } from "../application/oauth-provider-registry.js";
import { OAuthStateStore } from "../application/oauth-state-store.js";
import {
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema
} from "./auth-schemas.js";
import { HttpError } from "../../../shared/http-error.js";
import { env } from "../../../config/env.js";
import { AttemptLimiter, clientIp } from "../../../shared/attempt-limiter.js";
import type { EventService } from "../../events/application/event-service.js";
import type { WishlistRepository } from "../../events/domain/wishlist-repository.js";
import type { ListingService } from "../../listings/application/listing-service.js";

function extractBearerToken(authorizationHeader?: string): string {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing Bearer token.");
  }

  return authorizationHeader.substring("Bearer ".length);
}

export function createAuthRoutes(
  authService: AuthService,
  oauthProviderRegistry: OAuthProviderRegistry,
  oauthStateStore: OAuthStateStore,
  eventService: EventService,
  listingService: ListingService,
  wishlistRepository: WishlistRepository
): Router {
  const router = Router();
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  // Failed logins: 5 per email and 20 per network per 15 minutes. Success clears the email count.
  const loginFailuresByEmail = new AttemptLimiter(5, FIFTEEN_MINUTES);
  const loginFailuresByIp = new AttemptLimiter(20, FIFTEEN_MINUTES);
  const registrationsByIp = new AttemptLimiter(10, 60 * 60 * 1000);
  const resendsByEmail = new AttemptLimiter(3, FIFTEEN_MINUTES);
  const resendsByIp = new AttemptLimiter(10, FIFTEEN_MINUTES);

  router.post("/register", async (req, res, next) => {
    try {
      const input = registerSchema.parse(req.body);
      const ipKey = clientIp(req);
      registrationsByIp.assertAllowed(ipKey, "Too many sign-ups from this network.");
      registrationsByIp.record(ipKey);
      const result = await authService.register({
        email: input.email,
        displayName: input.displayName,
        password: input.password
      });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const input = loginSchema.parse(req.body);
      const emailKey = input.email.trim().toLowerCase();
      const ipKey = clientIp(req);
      const limitMessage = "Too many failed login attempts.";
      loginFailuresByEmail.assertAllowed(emailKey, limitMessage);
      loginFailuresByIp.assertAllowed(ipKey, limitMessage);
      let result;
      try {
        result = await authService.login(input);
      } catch (error) {
        if (error instanceof HttpError && error.statusCode === 401) {
          loginFailuresByEmail.record(emailKey);
          loginFailuresByIp.record(ipKey);
        }
        throw error;
      }
      loginFailuresByEmail.reset(emailKey);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  });

  router.get("/account/overview", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      const [sellingListings, boughtEvents, sentRequests, incomingRequests, wishlistedEventIds] = await Promise.all([
        listingService.listListings({ sellerId: user.id, includeSoldOut: true }),
        listingService.listBoughtEvents(user.id),
        listingService.listPurchaseRequestsByBuyer(user.id),
        listingService.listPurchaseRequestsBySeller(user.id),
        wishlistRepository.listEventIdsByUserId(user.id)
      ]);
      const wishlistedEvents = await Promise.all(
        wishlistedEventIds.map(async (eventId) => eventService.getEventById(eventId).catch(() => null))
      );

      res.status(200).json({
        sellingEvents: sellingListings.map((listing) => ({
          eventId: listing.eventId,
          eventTitle: listing.eventTitle,
          city: listing.eventCity,
          active: !listing.soldOut,
          listingId: listing.id
        })),
        boughtEvents,
        ticketRequestsSent: sentRequests,
        ticketRequestsIncoming: incomingRequests,
        wishlistedEvents: wishlistedEvents.filter(Boolean)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/account/wishlist", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      const eventIds = await wishlistRepository.listEventIdsByUserId(user.id);
      res.status(200).json({ eventIds });
    } catch (error) {
      next(error);
    }
  });

  router.post("/account/wishlist", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      const schema = z.object({ eventId: z.string().min(1) });
      const input = schema.parse(req.body);
      await eventService.getEventById(input.eventId);
      await wishlistRepository.add(user.id, input.eventId);
      res.status(201).json({ message: "Added to wishlist." });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/account/wishlist/:eventId", async (req, res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const user = await authService.getCurrentUser(token);
      await wishlistRepository.remove(user.id, req.params.eventId);
      res.status(200).json({ message: "Removed from wishlist." });
    } catch (error) {
      next(error);
    }
  });

  router.get("/oauth/providers", (_req, res) => {
    res.status(200).json({
      providers: oauthProviderRegistry.listProviderSummaries()
    });
  });

  router.get("/oauth/:provider/start", async (req, res, next) => {
    try {
      const provider = req.params.provider;
      if (provider !== "google" && provider !== "apple") {
        throw new HttpError(400, "Unsupported OAuth provider.");
      }

      const nonce = typeof req.query.nonce === "string" ? req.query.nonce : undefined;
      if (nonce !== undefined && !/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) {
        throw new HttpError(400, "Invalid sign-in request.");
      }
      const state = oauthStateStore.issue(nonce);
      const adapter = oauthProviderRegistry.getProvider(provider);
      const authorizationUrl = await adapter.getAuthorizationUrl(state);

      res.status(200).json({
        provider,
        authorizationUrl
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/oauth/:provider/callback", async (req, res, _next) => {
    try {
      const provider = req.params.provider;
      if (provider !== "google" && provider !== "apple") {
        throw new HttpError(400, "Unsupported OAuth provider.");
      }

      const code = req.query.code;
      const state = req.query.state;
      if (typeof code !== "string" || typeof state !== "string") {
        throw new HttpError(400, "Missing OAuth callback parameters.");
      }

      const { browserNonce } = oauthStateStore.consumeOrThrow(state);
      const adapter = oauthProviderRegistry.getProvider(provider);
      const identity = await adapter.exchangeCodeForIdentity(code);
      const result = await authService.loginOrRegisterOAuth(provider, identity);

      const redirectUrl = new URL("/auth/oauth/callback", env.APP_WEB_URL);
      redirectUrl.searchParams.set("token", result.token);
      if (browserNonce) {
        redirectUrl.searchParams.set("nonce", browserNonce);
      }
      res.redirect(302, redirectUrl.toString());
    } catch (error) {
      const redirectUrl = new URL("/auth/oauth/callback", env.APP_WEB_URL);
      const message =
        error instanceof HttpError ? error.message : "OAuth authentication failed.";
      redirectUrl.searchParams.set("error", message);
      res.redirect(302, redirectUrl.toString());
    }
  });

  router.post("/verify-email", async (req, res, next) => {
    try {
      const input = verifyEmailSchema.parse(req.body);
      const result = await authService.verifyEmail(input.token);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/verify-email/resend", async (req, res, next) => {
    try {
      const input = resendVerificationSchema.parse(req.body);
      const emailKey = input.email.trim().toLowerCase();
      const ipKey = clientIp(req);
      const limitMessage = "Too many verification emails requested.";
      resendsByEmail.assertAllowed(emailKey, limitMessage);
      resendsByIp.assertAllowed(ipKey, limitMessage);
      resendsByEmail.record(emailKey);
      resendsByIp.record(ipKey);
      const result = await authService.resendVerificationEmail(input.email);
      res.status(200).json(result);
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
