import { Router } from "express";
import { ZodError, z } from "zod";
import { env } from "../../../config/env.js";
import { AttemptLimiter, clientIp } from "../../../shared/attempt-limiter.js";
import { HttpError } from "../../../shared/http-error.js";
import { getPrimaryTrustedSellerEmail } from "../../../shared/trusted-seller.js";
import type { EmailSender } from "../../auth/domain/email-sender.js";

const sellerApplicationSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100),
  email: z.email("Enter a valid email.").trim().max(200),
  description: z
    .string()
    .trim()
    .min(10, "Tell us a little more (at least 10 characters).")
    .max(1000, "Keep it under 1000 characters."),
  // Honeypot: hidden from people, filled in by bots.
  website: z.string().optional()
});

/** Public "apply to be a verified seller" form. Emails the application to the site owner. */
export function createSellerApplicationRoutes(emailSender: EmailSender): Router {
  const router = Router();
  const applicationsByIp = new AttemptLimiter(5, 60 * 60 * 1000);

  router.post("/", async (req, res, next) => {
    try {
      const input = sellerApplicationSchema.parse(req.body);
      const ipKey = clientIp(req);
      applicationsByIp.assertAllowed(ipKey, "Too many applications from this network.");
      applicationsByIp.record(ipKey);

      if (input.website) {
        // Looks like a bot. Answer like a success so it doesn't retry.
        res.status(202).json({ ok: true });
        return;
      }

      const to = env.SELLER_APPLICATIONS_EMAIL ?? getPrimaryTrustedSellerEmail();
      if (!to) {
        console.warn("[seller-applications] no inbox configured; set SELLER_APPLICATIONS_EMAIL.");
        throw new HttpError(503, "Seller applications aren't open right now. Try again later.");
      }

      await emailSender.sendSellerApplicationEmail({
        to,
        name: input.name,
        email: input.email,
        description: input.description
      });
      res.status(202).json({ ok: true });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: error.issues[0]?.message ?? "Invalid request body.",
          issues: error.issues
        });
        return;
      }
      next(error);
    }
  });

  return router;
}
