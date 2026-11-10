"use client";

import Link from "next/link";
import { useUpcomingEvents } from "@/lib/hooks/useUpcomingEvents";

// Slim scrolling strip of real upcoming events. Pauses on hover; stops for reduced motion.
export function EventTicker() {
  const { data } = useUpcomingEvents();
  const events = data?.events.slice(0, 12) ?? [];
  if (!events.length) {
    return <div className="h-9 border-b border-[var(--border)]" aria-hidden="true" />;
  }

  const items = [...events, ...events];
  return (
    // Colors come from the featured ticket's image (see FeaturedPalette); defaults otherwise.
    <div className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-r from-[var(--feature-dark,var(--background))] to-[var(--feature-dark-2,var(--background))] transition-colors duration-700">
      <div className="marquee-track flex w-max">
        {items.map((event, index) => (
          <Link
            key={`${event.id}-${index}`}
            href={`/events/${event.id}`}
            aria-hidden={index >= events.length ? true : undefined}
            tabIndex={index >= events.length ? -1 : undefined}
            className="flex items-baseline gap-2 whitespace-nowrap px-6 py-2.5 text-[13px] text-[var(--muted)] transition-colors hover:text-white"
          >
            <span className="font-medium text-[var(--feature-light,var(--foreground))]">{event.title}</span>
            <span className="tabular text-xs text-[var(--feature-accent,var(--blue-soft))]">
              {new Date(event.startAt).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric"
              })}
            </span>
          </Link>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[var(--feature-dark,var(--background))] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--feature-dark-2,var(--background))] to-transparent" />
    </div>
  );
}
