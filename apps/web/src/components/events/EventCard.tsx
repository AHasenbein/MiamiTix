"use client";

import Link from "next/link";
import type { Event } from "@/lib/api/events";
import { miamiTimeSuffix } from "@/lib/datetime";
import { EventMeta } from "./EventsCarousel";

interface EventCardProps {
  event: Event;
  isWishlisted?: boolean;
  isWishlistUpdating?: boolean;
  onToggleWishlist?: (eventId: string) => void;
  /** Lowest active listing price, already formatted ("$85"). */
  fromPrice?: string | null;
}

export function EventCard({
  event,
  isWishlisted = false,
  isWishlistUpdating = false,
  onToggleWishlist,
  fromPrice = null
}: EventCardProps) {
  const startDate = new Date(event.startAt);
  const dateLabel = startDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  const timeLabel = `${startDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  })}${miamiTimeSuffix(event.startAt)}`;
  const shouldShowVenue = Boolean(event.venue?.trim()) && event.venue.trim() !== "TBD";

  return (
    <div className="relative">
      {onToggleWishlist ? (
        <button
          type="button"
          className={`absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border bg-[var(--background)]/80 backdrop-blur text-base transition-colors disabled:opacity-60 ${
            isWishlisted
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--silver)] hover:border-[var(--border-strong)] hover:text-white"
          }`}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={isWishlisted}
          onClick={(eventClick) => {
            eventClick.preventDefault();
            eventClick.stopPropagation();
            onToggleWishlist(event.id);
          }}
          disabled={isWishlistUpdating}
        >
          {isWishlisted ? "★" : "☆"}
        </button>
      ) : null}
      <Link
        href={`/events/${event.id}`}
        className="group grid gap-3 rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]">
          {event.imageUrl ? (
            <img
              alt={`${event.title} event image`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              src={event.imageUrl}
            />
          ) : null}
        </div>
        <EventMeta
          title={event.title}
          when={`${dateLabel} · ${timeLabel}`}
          where={shouldShowVenue ? event.venue : event.city}
          fromPrice={fromPrice}
        />
      </Link>
    </div>
  );
}
