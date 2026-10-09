"use client";

import { useEffect, useState } from "react";
import { addEventToWishlist, getAccountOverview, removeEventFromWishlist } from "@/lib/api/auth";
import type { Event } from "@/lib/api/events";
import { listEvents } from "@/lib/api/events";
import { ApiClientError } from "@/lib/api/client";
import { readAuthToken } from "@/lib/auth/token-storage";
import { Alert } from "../ui/Alert";
import { EventCard } from "./EventCard";

export function EventsBrowse() {
  const [events, setEvents] = useState<Event[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [wishlistError, setWishlistError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [wishlistedEventIds, setWishlistedEventIds] = useState<string[]>([]);
  const [wishlistUpdatingIds, setWishlistUpdatingIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const token = readAuthToken();
        // Wishlist state is optional: an expired session must not hide the events.
        const [eventsResponse, accountOverview] = await Promise.all([
          listEvents(),
          token ? getAccountOverview(token).catch(() => null) : Promise.resolve(null)
        ]);
        if (!cancelled) {
          setEvents(eventsResponse);
          setWishlistedEventIds(
            accountOverview ? accountOverview.wishlistedEvents.map((event) => event.id) : []
          );
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiClientError ? error.message : "Could not load events."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggleWishlist(eventId: string) {
    const token = readAuthToken();
    if (!token) {
      setWishlistError("Log in to wishlist events.");
      return;
    }
    if (wishlistUpdatingIds.includes(eventId)) {
      return;
    }

    const isWishlisted = wishlistedEventIds.includes(eventId);
    // Functional updates so concurrent toggles on different cards don't clobber each other.
    const setWishlisted = (wishlisted: boolean) =>
      setWishlistedEventIds((current) =>
        wishlisted
          ? current.includes(eventId) ? current : [...current, eventId]
          : current.filter((id) => id !== eventId)
      );

    setWishlistError("");
    setWishlistUpdatingIds((current) => [...current, eventId]);
    setWishlisted(!isWishlisted);
    try {
      if (isWishlisted) {
        await removeEventFromWishlist(eventId, token);
      } else {
        await addEventToWishlist(eventId, token);
      }
    } catch (error) {
      setWishlisted(isWishlisted);
      setWishlistError(
        error instanceof ApiClientError ? error.message : "Could not update wishlist."
      );
    } finally {
      setWishlistUpdatingIds((current) => current.filter((id) => id !== eventId));
    }
  }

  return (
    <section className="grid gap-4" aria-busy={isLoading}>
      {isLoading ? (
        <p className="muted-text text-sm" role="status" aria-live="polite">
          Loading events...
        </p>
      ) : null}
      {errorMessage ? <Alert tone="error">{errorMessage}</Alert> : null}
      {wishlistError ? <Alert tone="info">{wishlistError}</Alert> : null}
      {!isLoading && !errorMessage && !events.length ? (
        <Alert tone="info">
          No events are currently listed for sale.
        </Alert>
      ) : null}
      {!isLoading && !errorMessage && events.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard
              event={event}
              key={event.id}
              isWishlisted={wishlistedEventIds.includes(event.id)}
              isWishlistUpdating={wishlistUpdatingIds.includes(event.id)}
              onToggleWishlist={handleToggleWishlist}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
