"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AccountOverview, AuthUser } from "@/lib/api/auth";
import { getAccountOverview, getCurrentUser, removeEventFromWishlist } from "@/lib/api/auth";
import { updatePurchaseRequestStatus } from "@/lib/api/listings";
import { ApiClientError } from "@/lib/api/client";
import { clearAuthToken, readAuthToken } from "@/lib/auth/token-storage";
import { deleteAllEventsLocal } from "@/lib/api/events";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { ButtonLink } from "../ui/ButtonLink";
import { SurfaceCard } from "../ui/SurfaceCard";

export function AccountPanel() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingAllEvents, setIsDeletingAllEvents] = useState(false);
  const [busyIds, setBusyIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const token = readAuthToken();
      if (!token) {
        router.replace("/auth/login");
        return;
      }

      try {
        // Load profile and activity separately so an overview failure doesn't hide the profile.
        const overviewPromise = getAccountOverview(token);
        overviewPromise.catch(() => undefined);
        const userResult = await getCurrentUser(token);
        if (!cancelled) {
          setUser(userResult.user);
        }
        const accountResult = await overviewPromise;
        if (!cancelled) {
          setOverview(accountResult);
        }
      } catch (error) {
        if (error instanceof ApiClientError && error.statusCode === 401) {
          clearAuthToken();
          router.replace(`/auth/login?returnTo=${encodeURIComponent("/account")}`);
          return;
        }
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiClientError
              ? error.message
              : "Could not load your account."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function runBusy(id: string, action: (token: string) => Promise<void>) {
    const token = readAuthToken();
    if (!token) {
      router.push(`/auth/login?returnTo=${encodeURIComponent("/account")}`);
      return;
    }
    if (busyIds.includes(id)) {
      return;
    }
    setBusyIds((current) => [...current, id]);
    setErrorMessage("");
    try {
      await action(token);
    } catch (error) {
      setErrorMessage(error instanceof ApiClientError ? error.message : "Something went wrong.");
    } finally {
      setBusyIds((current) => current.filter((value) => value !== id));
    }
  }

  function setRequestStatus(
    requestId: string,
    status: "contacted" | "cancelled",
    list: "ticketRequestsSent" | "ticketRequestsIncoming"
  ) {
    void runBusy(requestId, async (token) => {
      await updatePurchaseRequestStatus(requestId, status, token);
      setOverview((current) =>
        current
          ? {
              ...current,
              [list]: current[list].map((request) =>
                request.requestId === requestId ? { ...request, status } : request
              )
            }
          : current
      );
    });
  }

  function removeWishlistedEvent(eventId: string) {
    void runBusy(eventId, async (token) => {
      await removeEventFromWishlist(eventId, token);
      setOverview((current) =>
        current
          ? {
              ...current,
              wishlistedEvents: current.wishlistedEvents.filter((event) => event.id !== eventId)
            }
          : current
      );
    });
  }

  async function handleDeleteAllEvents() {
    const token = readAuthToken();
    if (!token) {
      router.push("/auth/login");
      return;
    }

    if (
      !window.confirm(
        "Delete ALL events, listings, purchases, purchase requests, and wishlist entries? This cannot be undone."
      )
    ) {
      return;
    }

    setIsDeletingAllEvents(true);
    setErrorMessage("");
    setAdminMessage("");
    try {
      const result = await deleteAllEventsLocal(token);
      setOverview((current) =>
        current
          ? {
              ...current,
              wishlistedEvents: [],
              boughtEvents: [],
              sellingEvents: [],
              ticketRequestsSent: [],
              ticketRequestsIncoming: []
            }
          : current
      );
      setAdminMessage(result.message);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError ? error.message : "Could not delete events."
      );
    } finally {
      setIsDeletingAllEvents(false);
    }
  }

  return (
    <SurfaceCard className="w-full max-w-2xl p-5 sm:p-8">
      <h1 className="brand-heading text-2xl font-semibold">Your account</h1>
      <p className="muted-text mt-2 text-sm">Your profile, wishlist, and ticket activity.</p>

      {isLoading ? (
        <p className="muted-text mt-6" role="status" aria-live="polite">
          Loading account...
        </p>
      ) : null}

      {errorMessage ? (
        <Alert tone="error" className="mt-6" announce="assertive">
          {errorMessage}
        </Alert>
      ) : null}
      {adminMessage ? (
        <Alert tone="success" className="mt-6">
          {adminMessage}
        </Alert>
      ) : null}

      {user ? (
        <dl className="mt-6 grid gap-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-[var(--border)] py-3">
            <dt className="muted-text shrink-0">Name</dt>
            <dd className="min-w-0 text-right">{user.displayName}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--border)] py-3">
            <dt className="muted-text shrink-0">Email</dt>
            <dd className="min-w-0 break-words text-right">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--border)] py-3">
            <dt className="muted-text shrink-0">Providers</dt>
            <dd className="min-w-0 text-right">{user.providers.join(", ")}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--border)] py-3">
            <dt className="muted-text shrink-0">Seller access</dt>
            <dd className="min-w-0 text-right">{user.isTrustedSeller ? "Trusted seller" : "Not approved yet"}</dd>
          </div>
        </dl>
      ) : null}

      {overview ? (
        <div className="mt-8 grid gap-6">
          <section className="grid gap-2">
            <h2 className="brand-heading text-lg font-semibold">Wishlisted events</h2>
            {overview.wishlistedEvents.length ? (
              <ul className="grid gap-2 text-sm">
                {overview.wishlistedEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Link href={`/events/${event.id}`} className="underline-offset-4 hover:underline">
                        {event.title}
                      </Link>
                      <p className="muted-text text-xs">
                        {event.city}
                        {event.startAt ? ` - ${new Date(event.startAt).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="muted-text shrink-0 text-xs underline underline-offset-4 disabled:opacity-60"
                      disabled={busyIds.includes(event.id)}
                      onClick={() => removeWishlistedEvent(event.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text text-sm">No wishlisted events yet.</p>
            )}
          </section>

          <section className="grid gap-2">
            <h2 className="brand-heading text-lg font-semibold">Ticket requests sent</h2>
            {overview.ticketRequestsSent.length ? (
              <ul className="grid gap-2 text-sm">
                {overview.ticketRequestsSent.map((request) => (
                  <li
                    key={request.requestId}
                    className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2"
                  >
                    <Link
                      href={`/listings/${request.listingId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {request.eventTitle}
                    </Link>
                    <p className="muted-text text-xs">
                      {request.city} - {request.quantity} ticket{request.quantity === 1 ? "" : "s"}
                      {request.unitPriceCents
                        ? ` at $${(request.unitPriceCents / 100).toFixed(2)} each`
                        : ""}{" "}
                      - {request.status} - sent {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    {request.status === "pending" ? (
                      <button
                        type="button"
                        className="muted-text mt-1 text-xs underline underline-offset-4 disabled:opacity-60"
                        disabled={busyIds.includes(request.requestId)}
                        onClick={() =>
                          setRequestStatus(request.requestId, "cancelled", "ticketRequestsSent")
                        }
                      >
                        Cancel request
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text text-sm">No ticket requests sent yet.</p>
            )}
          </section>

          <section className="grid gap-2">
            <h2 className="brand-heading text-lg font-semibold">Events selling</h2>
            {overview.sellingEvents.length ? (
              <ul className="grid gap-2 text-sm">
                {overview.sellingEvents.map((event) => (
                  <li
                    key={event.listingId}
                    className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2"
                  >
                    <Link
                      href={`/listings/${event.listingId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {event.eventTitle}
                    </Link>
                    <p className="muted-text text-xs">
                      {event.city} - {event.active ? "Active listing" : "Sold out"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text text-sm">No selling activity yet.</p>
            )}
          </section>

          <section className="grid gap-2">
            <h2 className="brand-heading text-lg font-semibold">Incoming buyer requests</h2>
            {overview.ticketRequestsIncoming.length ? (
              <ul className="grid gap-2 text-sm">
                {overview.ticketRequestsIncoming.map((request) => (
                  <li
                    key={request.requestId}
                    className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2"
                  >
                    <Link
                      href={`/listings/${request.listingId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {request.eventTitle}
                    </Link>
                    <p className="muted-text text-xs">
                      {request.buyerName ? `${request.buyerName} - ` : ""}Qty {request.quantity}
                      {request.unitPriceCents
                        ? ` at $${(request.unitPriceCents / 100).toFixed(2)}`
                        : ""}{" "}
                      - Buyer phone:{" "}
                      <a
                        href={`tel:${request.buyerPhone.replace(/[^\d+]/g, "")}`}
                        className="underline underline-offset-4"
                      >
                        {request.buyerPhone}
                      </a>{" "}
                      - {request.status}
                    </p>
                    {request.status === "pending" ? (
                      <div className="mt-1 flex flex-wrap gap-3 text-xs">
                        <a
                          href={`sms:${request.buyerPhone.replace(/[^\d+]/g, "")}`}
                          className="underline underline-offset-4"
                        >
                          Text buyer
                        </a>
                        <button
                          type="button"
                          className="underline underline-offset-4 disabled:opacity-60"
                          disabled={busyIds.includes(request.requestId)}
                          onClick={() =>
                            setRequestStatus(request.requestId, "contacted", "ticketRequestsIncoming")
                          }
                        >
                          Mark contacted
                        </button>
                        <button
                          type="button"
                          className="muted-text underline underline-offset-4 disabled:opacity-60"
                          disabled={busyIds.includes(request.requestId)}
                          onClick={() =>
                            setRequestStatus(request.requestId, "cancelled", "ticketRequestsIncoming")
                          }
                        >
                          Decline
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text text-sm">No incoming requests yet.</p>
            )}
          </section>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <ButtonLink href="/listings/mine" variant="secondary">
          My listings
        </ButtonLink>
        <Button
          variant="ghost"
          onClick={() => {
            clearAuthToken();
            router.push("/auth/login");
          }}
        >
          Log out
        </Button>
      </div>
      {user?.isPrimaryTrustedSeller ? (
        <div className="mt-4">
          <Button
            variant="danger"
            disabled={isDeletingAllEvents}
            onClick={handleDeleteAllEvents}
          >
            {isDeletingAllEvents ? "Deleting..." : "Delete all events"}
          </Button>
        </div>
      ) : null}
    </SurfaceCard>
  );
}
