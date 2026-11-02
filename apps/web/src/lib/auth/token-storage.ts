const AUTH_TOKEN_KEY = "ticket_splice_auth_token";

export function saveAuthToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function readAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  // Don't leave the last buyer's phone number behind on a shared device.
  window.localStorage.removeItem("ticket_splice_buyer_phone");
}

/** Only allow same-site relative paths as post-login redirects (blocks open redirects). */
export function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  return value;
}

const OAUTH_RETURN_TO_KEY = "ticket_splice_oauth_return_to";
const BUYER_PHONE_KEY = "ticket_splice_buyer_phone";

/** Google sign-in leaves the site, so remember where to send the user once they come back. */
export function saveOAuthReturnTo(returnTo: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (returnTo) {
    window.sessionStorage.setItem(OAUTH_RETURN_TO_KEY, returnTo);
  } else {
    window.sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);
  }
}

export function takeOAuthReturnTo(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.sessionStorage.getItem(OAUTH_RETURN_TO_KEY);
  window.sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);
  return safeReturnTo(value);
}

/** Remember the buyer's phone so the next ticket request is prefilled. */
export function readSavedBuyerPhone(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(BUYER_PHONE_KEY) ?? "";
}

export function saveBuyerPhone(phone: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(BUYER_PHONE_KEY, phone);
}
