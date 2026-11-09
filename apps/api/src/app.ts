import cors from "cors";
import express from "express";
import helmet from "helmet";
import type { NextFunction, Request, Response } from "express";
import { createAuthRoutes } from "./modules/auth/presentation/auth-routes.js";
import { MongoUserRepository } from "./modules/auth/infrastructure/mongo-user-repository.js";
import { SessionService } from "./modules/auth/application/session-service.js";
import { AuthService } from "./modules/auth/application/auth-service.js";
import { OAuthProviderRegistry } from "./modules/auth/application/oauth-provider-registry.js";
import { OAuthStateStore } from "./modules/auth/application/oauth-state-store.js";
import { VerificationEmailSender } from "./modules/auth/infrastructure/email-sender.js";
import { GoogleOAuthProvider } from "./modules/auth/infrastructure/google-oauth-provider.js";
import { env } from "./config/env.js";
import { HttpError } from "./shared/http-error.js";
import { EventService } from "./modules/events/application/event-service.js";
import { MongoEventRepository } from "./modules/events/infrastructure/mongo-event-repository.js";
import { createEventRoutes } from "./modules/events/presentation/event-routes.js";
import { MongoListingRepository } from "./modules/listings/infrastructure/mongo-listing-repository.js";
import { ListingService } from "./modules/listings/application/listing-service.js";
import { createListingRoutes } from "./modules/listings/presentation/listing-routes.js";
import { MongoPurchaseRepository } from "./modules/listings/infrastructure/mongo-purchase-repository.js";
import { MongoWishlistRepository } from "./modules/events/infrastructure/mongo-wishlist-repository.js";
import { MongoFeaturedEventRepository } from "./modules/events/infrastructure/mongo-featured-event-repository.js";
import { MongoPurchaseRequestRepository } from "./modules/listings/infrastructure/mongo-purchase-request-repository.js";
import { createSellerApplicationRoutes } from "./modules/seller/presentation/seller-application-routes.js";

export function createApp() {
  const app = express();
  const normalizedConfiguredOrigins = env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  const developmentOrigins =
    env.NODE_ENV === "development"
      ? [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3001"
        ]
      : [];
  const allowedOrigins = new Set([...normalizedConfiguredOrigins, ...developmentOrigins]);

  const userRepository = new MongoUserRepository();
  const sessionService = new SessionService();
  const emailSender = new VerificationEmailSender();
  const authService = new AuthService(userRepository, sessionService, emailSender);
  const oauthStateStore = new OAuthStateStore();
  const oauthProviderRegistry = new OAuthProviderRegistry(
    env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      env.GOOGLE_OAUTH_REDIRECT_URI
      ? [new GoogleOAuthProvider()]
      : []
  );
  const eventRepository = new MongoEventRepository();
  const eventService = new EventService(eventRepository);
  const listingRepository = new MongoListingRepository();
  const purchaseRepository = new MongoPurchaseRepository();
  const purchaseRequestRepository = new MongoPurchaseRequestRepository();
  const listingService = new ListingService(
    listingRepository,
    eventService,
    purchaseRepository,
    purchaseRequestRepository,
    userRepository,
    emailSender
  );
  const wishlistRepository = new MongoWishlistRepository();
  const featuredEventRepository = new MongoFeaturedEventRepository();

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        const normalizedOrigin = origin.replace(/\/+$/, "");
        callback(null, allowedOrigins.has(normalizedOrigin));
      }
    })
  );
  // Listing/event image uploads send base64 data URLs (up to ~2.7MB for a 2MB file).
  app.use(express.json({ limit: "3mb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(
    "/api/v1/auth",
    createAuthRoutes(
      authService,
      oauthProviderRegistry,
      oauthStateStore,
      eventService,
      listingService,
      wishlistRepository
    )
  );
  app.use("/api/v1/events", createEventRoutes(eventService, authService, listingService, featuredEventRepository));
  app.use("/api/v1/listings", createListingRoutes(listingService, authService, eventService));
  app.use("/api/v1/seller-applications", createSellerApplicationRoutes(emailSender));

  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }

    if (
      error &&
      typeof error === "object" &&
      "type" in error &&
      (error as { type?: string }).type === "entity.too.large"
    ) {
      res.status(413).json({
        message: "Request body is too large. Use an image under 2MB."
      });
      return;
    }

    console.error(`[api] unexpected error on ${req.method} ${req.originalUrl}:`, error);
    res.status(500).json({
      message: "Unexpected server error."
    });
  });

  return app;
}
