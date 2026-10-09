import { env } from "../../../config/env.js";
import type {
  OAuthIdentity,
  OAuthProviderAdapter
} from "../domain/oauth-provider-adapter.js";
import { HttpError } from "../../../shared/http-error.js";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleUserInfoResponse {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

export class GoogleOAuthProvider implements OAuthProviderAdapter {
  id = "google" as const;

  async getAuthorizationUrl(state: string): Promise<string> {
    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_REDIRECT_URI) {
      throw new HttpError(400, "Google OAuth is not configured.");
    }

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID);
    url.searchParams.set("redirect_uri", env.GOOGLE_OAUTH_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");

    return url.toString();
  }

  async exchangeCodeForIdentity(code: string): Promise<OAuthIdentity> {
    if (
      !env.GOOGLE_OAUTH_CLIENT_ID ||
      !env.GOOGLE_OAUTH_CLIENT_SECRET ||
      !env.GOOGLE_OAUTH_REDIRECT_URI
    ) {
      throw new HttpError(400, "Google OAuth is not configured.");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
        grant_type: "authorization_code"
      })
    });

    const tokenBody = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenBody.access_token) {
      throw new HttpError(
        401,
        tokenBody.error ?? "Failed to exchange Google OAuth code."
      );
    }

    const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        authorization: `Bearer ${tokenBody.access_token}`
      }
    });

    const userInfoBody = (await userInfoResponse.json()) as GoogleUserInfoResponse;
    if (!userInfoResponse.ok || !userInfoBody.sub || !userInfoBody.email) {
      throw new HttpError(401, "Failed to fetch Google user profile.");
    }
    // Accounts are linked by email, so only trust addresses Google has verified.
    if (userInfoBody.email_verified !== true) {
      throw new HttpError(401, "Your Google email address is not verified.");
    }

    return {
      providerUserId: userInfoBody.sub,
      email: userInfoBody.email,
      displayName: userInfoBody.name
    };
  }
}
