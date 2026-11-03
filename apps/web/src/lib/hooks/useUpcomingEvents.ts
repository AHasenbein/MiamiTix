"use client";

import { useEffect, useState } from "react";
import type { Event } from "@/lib/api/events";
import { listEvents } from "@/lib/api/events";
import { listListings } from "@/lib/api/listings";

export interface UpcomingEventsData {
  /** Upcoming events, soonest first. */
  events: Event[];
  /** Lowest active listing price per event id, in cents. */
  lowestPriceCents: Record<string, number>;
}

// Shared across every component on the page, so the marquee, hero, spotlight and
// carousel make one request pair instead of four.
// Expires after a minute so client-side navigation picks up new listings.
const CACHE_MS = 60_000;
let inflight: Promise<UpcomingEventsData> | null = null;
let fetchedAt = 0;

async function loadUpcomingEvents(): Promise<UpcomingEventsData> {
  const [events, listings] = await Promise.all([
    listEvents({ limit: 50 }),
    listListings().catch(() => [])
  ]);
  const now = Date.now();
  const upcoming = events
    .filter((event) => new Date(event.startAt).getTime() > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const lowestPriceCents: Record<string, number> = {};
  for (const listing of listings) {
    if (!listing.eventId || listing.quantity <= 0) continue;
    const current = lowestPriceCents[listing.eventId];
    if (current === undefined || listing.priceCents < current) {
      lowestPriceCents[listing.eventId] = listing.priceCents;
    }
  }
  return { events: upcoming, lowestPriceCents };
}

export function useUpcomingEvents() {
  const [data, setData] = useState<UpcomingEventsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!inflight || Date.now() - fetchedAt > CACHE_MS) {
      fetchedAt = Date.now();
      inflight = loadUpcomingEvents().catch((reason) => {
        inflight = null; // let the next mount retry
        throw reason;
      });
    }
    const request = inflight;
    request
      .then((result) => !cancelled && setData(result))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error, isLoading: !data && !error };
}

export function formatFromPrice(cents: number | undefined): string | null {
  if (cents === undefined) return null;
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}
