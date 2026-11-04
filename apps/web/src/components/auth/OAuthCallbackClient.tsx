"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import {
  safeReturnTo,
  saveAuthToken,
  takeOAuthNonce,
  takeOAuthReturnTo
} from "@/lib/auth/token-storage";

export function OAuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");
  const returnedNonce = searchParams.get("nonce");
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const [isRedirectSlow, setIsRedirectSlow] = useState(false);
  // takeOAuthReturnTo() clears storage, and dev Strict Mode runs effects twice, so hold the
  // value in a ref to keep the second run from falling back to /events.
  const storedReturnToRef = useRef<string | null | undefined>(undefined);
  const storedNonceRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (token) {
      if (storedNonceRef.current === undefined) {
        storedNonceRef.current = takeOAuthNonce();
      }
      // Only accept a sign-in that this tab started. Otherwise someone could send a victim
      // their own callback link and quietly log the victim into the attacker's account.
      if (!storedNonceRef.current || storedNonceRef.current !== returnedNonce) {
        const params = new URLSearchParams({
          error:
            "This sign-in didn't start in this browser, so we stopped it. Please sign in again."
        });
        router.replace(`/auth/oauth/callback?${params.toString()}`);
        return undefined;
      }
      saveAuthToken(token);
      const timeout = setTimeout(() => {
        setIsRedirectSlow(true);
      }, 2500);
      if (storedReturnToRef.current === undefined) {
        storedReturnToRef.current = takeOAuthReturnTo();
      }
      router.replace(returnTo || storedReturnToRef.current || "/events");
      return () => {
        clearTimeout(timeout);
      };
    }
    return undefined;
  }, [returnTo, returnedNonce, router, token]);

  return (
    <SurfaceCard className="w-full max-w-md p-6 sm:p-8">
      {token ? (
        <div className="grid gap-3">
          <p className="muted-text text-sm" role="status" aria-live="polite">
            Signing you in...
          </p>
          {isRedirectSlow ? (
            <ButtonLink href={returnTo || "/events"} variant="secondary" className="w-full sm:w-auto">
              Continue
            </ButtonLink>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3">
          <h1 className="brand-heading text-xl font-semibold">OAuth sign-in failed</h1>
          <Alert tone="error" announce="assertive">
            {error ?? "Please try again."}
          </Alert>
          <Link href="/auth/login" className="text-sm underline">
            Back to login
          </Link>
        </div>
      )}
    </SurfaceCard>
  );
}
