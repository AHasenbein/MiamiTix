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
    <div className="relative overflow-hidden border-b border-[var(--border)]">
      <div className="marquee-track flex w-max">
        {items.map((event, index) => (
          <Link
            key={`${event.id}-${index}`}
            href={`/events/${event.id}`}
            aria-hidden={index >= events.length ? true : undefined}
            tabIndex={index >= events.length ? -1 : undefined}
            className="flex items-center gap-2 whitespace-nowrap px-5 py-2.5 text-[13px] text-[var(--muted)] transition-colors hover:text-white"
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${index % 2 ? "bg-[var(--blue)]" : "bg-[var(--pink)]"}`}
            />
            <span className="font-medium text-[var(--foreground)]">{event.title}</span>
            <span className="tabular text-xs">
              {new Date(event.startAt).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric"
              })}
            </span>
          </Link>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[var(--background)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--background)] to-transparent" />
    </div>
  );
}
