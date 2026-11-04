"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { addEventToWishlist, getAccountOverview, removeEventFromWishlist } from "@/lib/api/auth";
import type { Event } from "@/lib/api/events";
import { listEvents } from "@/lib/api/events";
import { listListings } from "@/lib/api/listings";
import { formatFromPrice } from "@/lib/hooks/useUpcomingEvents";
import { ApiClientError } from "@/lib/api/client";
import { readAuthToken } from "@/lib/auth/token-storage";
import { SearchAutocomplete } from "../search/SearchAutocomplete";
import { Alert } from "../ui/Alert";
import { EventCard } from "./EventCard";
import { OilBackground } from "./OilBackground";

export function EventsBrowse() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [events, setEvents] = useState<Event[]>([]);
  const [lowestPriceCents, setLowestPriceCents] = useState<Record<string, number>>({});
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
        const [eventsResponse, accountOverview, listings] = await Promise.all([
          listEvents({ query }),
          token ? getAccountOverview(token).catch(() => null) : Promise.resolve(null),
          listListings().catch(() => [])
        ]);
        if (!cancelled) {
          const lowest: Record<string, number> = {};
          for (const listing of listings) {
            if (listing.quantity <= 0) continue;
            const current = lowest[listing.eventId];
            if (current === undefined || listing.priceCents < current) {
              lowest[listing.eventId] = listing.priceCents;
            }
          }
          setLowestPriceCents(lowest);
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
  }, [query]);

  function submitSearch(nextQuery: string) {
    const trimmed = nextQuery.trim();
    router.replace(trimmed ? `${pathname}?q=${encodeURIComponent(trimmed)}` : pathname);
  }

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
    <section className="grid gap-5" aria-busy={isLoading}>
      <OilBackground imageUrls={events.map((event) => event.imageUrl)} />
      <SearchAutocomplete key={query} initialQuery={query} onSearch={submitSearch} className="max-w-xl" />
      {isLoading ? (
        <p className="muted-text text-sm" role="status" aria-live="polite">
          Loading events...
        </p>
      ) : null}
      {errorMessage ? <Alert tone="error">{errorMessage}</Alert> : null}
      {wishlistError ? <Alert tone="info">{wishlistError}</Alert> : null}
      {!isLoading && !errorMessage && !events.length ? (
        <Alert tone="info">
          {query ? `No upcoming events match “${query}”.` : "No events are currently listed for sale."}
        </Alert>
      ) : null}
      {!isLoading && !errorMessage && events.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {events.map((event) => (
            <EventCard
              event={event}
              key={event.id}
              isWishlisted={wishlistedEventIds.includes(event.id)}
              isWishlistUpdating={wishlistUpdatingIds.includes(event.id)}
              onToggleWishlist={handleToggleWishlist}
              fromPrice={formatFromPrice(lowestPriceCents[event.id])}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

