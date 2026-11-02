import { apiRequest } from "./client";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  providers: string[];
  emailVerified: boolean;
  isTrustedSeller: boolean;
  isPrimaryTrustedSeller: boolean;
  isTopTrustedSeller: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

export interface AccountOverview {
  wishlistedEvents: Array<{
    id: string;
    title: string;
    city: string;
    startAt: string;
  }>;
  boughtEvents: Array<{
    eventId: string;
    eventTitle: string;
    city: string;
    totalSpentCents: number;
    totalTickets: number;
  }>;
  sellingEvents: Array<{
    eventId: string;
    eventTitle: string;
    city: string;
    active: boolean;
    listingId: string;
  }>;
  ticketRequestsSent: Array<{
    requestId: string;
    listingId: string;
    eventId: string;
    eventTitle: string;
    city: string;
    quantity: number;
    buyerPhone: string;
    status: "pending" | "contacted" | "cancelled";
    unitPriceCents?: number;
    eventStartAt?: string;
    createdAt: string;
  }>;
  ticketRequestsIncoming: Array<{
    requestId: string;
    listingId: string;
    eventId: string;
    eventTitle: string;
    buyerId: string;
    buyerName?: string;
    quantity: number;
    buyerPhone: string;
    status: "pending" | "contacted" | "cancelled";
    unitPriceCents?: number;
    eventStartAt?: string;
    createdAt: string;
  }>;
}

export interface RegisterInput {
  email: string;
  displayName: string;
  password: string;
  confirmPassword: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: AuthUser;
  verificationRequired: boolean;
  verificationEmailSent?: boolean;
  verificationPreviewUrl?: string;
  token?: string;
}

export function register(input: RegisterInput): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getCurrentUser(token: string): Promise<MeResponse> {
  return apiRequest<MeResponse>("/api/v1/auth/me", {
    token
  });
}

export function getAccountOverview(token: string): Promise<AccountOverview> {
  return apiRequest<AccountOverview>("/api/v1/auth/account/overview", { token });
}

export async function listWishlistEventIds(token: string): Promise<string[]> {
  const response = await apiRequest<{ eventIds: string[] }>("/api/v1/auth/account/wishlist", {
    token
  });
  return response.eventIds ?? [];
}

export function addEventToWishlist(eventId: string, token: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/v1/auth/account/wishlist", {
    method: "POST",
    token,
    body: JSON.stringify({ eventId })
  });
}

export function removeEventFromWishlist(
  eventId: string,
  token: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/v1/auth/account/wishlist/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    token
  });
}

export interface OAuthProviderSummary {
  id: "google" | "apple";
  enabled: boolean;
}

interface OAuthProvidersResponse {
  providers: OAuthProviderSummary[];
  message?: string;
}

interface OAuthStartResponse {
  authorizationUrl: string;
}

export interface VerificationResponse {
  message: string;
  verificationRequired?: boolean;
  verificationPreviewUrl?: string;
}

export async function getOAuthProviders(): Promise<OAuthProvidersResponse> {
  const response = await apiRequest<OAuthProvidersResponse>("/api/v1/auth/oauth/providers");
  return response;
}

export async function getOAuthAuthorizationUrl(
  provider: OAuthProviderSummary["id"]
): Promise<string> {
  const response = await apiRequest<OAuthStartResponse>(`/api/v1/auth/oauth/${provider}/start`);
  return response.authorizationUrl;
}

export function verifyEmail(token: string): Promise<VerificationResponse> {
  return apiRequest<VerificationResponse>("/api/v1/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token })
  });
}

export function resendVerificationEmail(email: string): Promise<VerificationResponse> {
  return apiRequest<VerificationResponse>("/api/v1/auth/verify-email/resend", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}
