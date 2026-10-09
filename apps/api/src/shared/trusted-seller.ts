import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";

function parseTrustedSellerEmails(): string[] {
  return env.TRUSTED_SELLER_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

const trustedSellerEmailList = parseTrustedSellerEmails();
const trustedSellerEmails = new Set(trustedSellerEmailList);

export function getPrimaryTrustedSellerEmail(): string | null {
  return trustedSellerEmailList[0] ?? null;
}

export function getTopTrustedSellerEmails(limit = 3): string[] {
  const safeLimit = Math.max(1, limit);
  return trustedSellerEmailList.slice(0, safeLimit);
}

export function isTrustedSeller(email: string): boolean {
  if (trustedSellerEmails.size === 0) {
    return true;
  }
  return trustedSellerEmails.has(email.trim().toLowerCase());
}

// With no allowlist configured, admin powers (delete-all, edit-anything) are open to everyone
// for local development only. In production they fail closed.
const allowAllWhenUnconfigured = env.NODE_ENV !== "production";

export function isPrimaryTrustedSeller(email: string): boolean {
  const primaryEmail = getPrimaryTrustedSellerEmail();
  if (!primaryEmail) {
    return allowAllWhenUnconfigured;
  }
  return email.trim().toLowerCase() === primaryEmail;
}

export function isTopTrustedSeller(email: string, topLimit = 3): boolean {
  if (trustedSellerEmailList.length === 0) {
    return allowAllWhenUnconfigured;
  }
  return getTopTrustedSellerEmails(topLimit).includes(email.trim().toLowerCase());
}

export function assertTrustedSeller(email: string): void {
  if (!isTrustedSeller(email)) {
    throw new HttpError(
      403,
      "Only trusted seller accounts can create events or listings."
    );
  }
}

export function assertPrimaryTrustedSeller(email: string): void {
  if (!isPrimaryTrustedSeller(email)) {
    throw new HttpError(403, "Only the primary trusted seller can delete all events.");
  }
}

export function assertTopTrustedSeller(email: string, topLimit = 3): void {
  if (!isTopTrustedSeller(email, topLimit)) {
    throw new HttpError(403, "Only top trusted sellers can edit this resource.");
  }
}
