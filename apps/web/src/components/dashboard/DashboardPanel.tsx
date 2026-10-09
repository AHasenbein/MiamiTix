"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/api/auth";
import { getCurrentUser } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import { clearAuthToken, readAuthToken } from "@/lib/auth/token-storage";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export function DashboardPanel() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const token = readAuthToken();
      if (!token) {
        router.replace("/auth/login");
        return;
      }

      try {
        const response = await getCurrentUser(token);
        if (!cancelled) {
          setUser(response.user);
        }
      } catch (error) {
        if (error instanceof ApiClientError && error.statusCode === 401) {
          clearAuthToken();
          router.replace(`/auth/login?returnTo=${encodeURIComponent("/dashboard")}`);
          return;
        }
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiClientError ? error.message : "Could not load your dashboard."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (isLoading) {
    return (
      <p className="muted-text text-sm" role="status" aria-live="polite">
        Loading your dashboard...
      </p>
    );
  }

  return (
    <div className="grid w-full max-w-4xl gap-5">
      <SurfaceCard className="grid gap-5 p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="muted-text text-xs uppercase tracking-[0.18em]">dashboard</p>
            <h1 className="brand-heading mt-2 break-words text-2xl font-semibold sm:text-3xl">
              {user ? `Welcome, ${user.displayName}` : "Welcome"}
            </h1>
            <p className="muted-text mt-2 text-sm">
              You are signed in and ready to browse events and manage your marketplace activity.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <ButtonLink href="/events" variant="secondary" className="w-full sm:w-auto">
              Browse events
            </ButtonLink>
            {user?.isTrustedSeller ? (
              <ButtonLink href="/listings/new" variant="ghost" className="w-full sm:w-auto">
                Sell tickets
              </ButtonLink>
            ) : null}
            <ButtonLink href="/account" variant="ghost" className="w-full sm:w-auto">
              My account
            </ButtonLink>
          </div>
        </div>
        {errorMessage ? (
          <Alert tone="error" announce="assertive">
            {errorMessage}
          </Alert>
        ) : null}
      </SurfaceCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <SurfaceCard className="p-5" elevated={false}>
          <p className="muted-text text-xs uppercase tracking-[0.16em]">Status</p>
          <p className="brand-heading mt-3 text-base font-medium">Account active</p>
          <p className="muted-text mt-1 text-sm">Session is valid and secured.</p>
        </SurfaceCard>
        <SurfaceCard className="p-5" elevated={false}>
          <p className="muted-text text-xs uppercase tracking-[0.16em]">Auth</p>
          <p className="brand-heading mt-3 text-base font-medium">
            {user?.providers.join(", ") || "Unknown"}
          </p>
          <p className="muted-text mt-1 text-sm">Sign-in method linked to your profile.</p>
        </SurfaceCard>
        <SurfaceCard className="p-5" elevated={false}>
          <p className="muted-text text-xs uppercase tracking-[0.16em]">Quick action</p>
          <p className="brand-heading mt-3 text-base font-medium">
            {user?.isTrustedSeller ? "List your next ticket" : "Seller approval required"}
          </p>
          <p className="muted-text mt-1 text-sm">
            {user?.isTrustedSeller
              ? "Create a listing in under a minute."
              : "Ask support to add your email to trusted seller accounts."}
          </p>
          {user?.isTrustedSeller ? (
            <ButtonLink href="/listings/new" variant="ghost" className="mt-3 w-full sm:w-auto">
              Create listing
            </ButtonLink>
          ) : null}
        </SurfaceCard>
      </div>

      <div className="flex justify-start">
        <Button
          variant="danger"
          onClick={() => {
            clearAuthToken();
            router.replace("/auth/login");
          }}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
