"use client";

import Link from "next/link";
import type { Event } from "@/lib/api/events";
import { miamiTimeSuffix } from "@/lib/datetime";

interface EventCardProps {
  event: Event;
  isWishlisted?: boolean;
  isWishlistUpdating?: boolean;
  onToggleWishlist?: (eventId: string) => void;
}

export function EventCard({
  event,
  isWishlisted = false,
  isWishlistUpdating = false,
  onToggleWishlist
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
          className={`absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border bg-[var(--background)]/90 text-base transition-colors disabled:opacity-60 ${
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
        <div className="aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)]">
          {event.imageUrl ? (
            <img
              alt={`${event.title} event image`}
              className="h-full w-full object-cover transition-opacity duration-150 group-hover:opacity-90"
              src={event.imageUrl}
            />
          ) : null}
        </div>
        <div className="grid gap-0.5">
          <p className="tabular line-clamp-1 text-xs text-[var(--accent)]">
            {dateLabel} · {timeLabel}
          </p>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--foreground)] group-hover:underline group-hover:decoration-[var(--border-strong)] group-hover:underline-offset-4">
            {event.title}
          </h3>
          <p className="line-clamp-1 text-sm text-[var(--muted)]">
            {shouldShowVenue ? `${event.venue}, ${event.city}` : event.city}
          </p>
        </div>
      </Link>
    </div>
  );
}
