"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Event } from "@/lib/api/events";
import { getFeaturedEvent } from "@/lib/api/events";
import { miamiTimeSuffix } from "@/lib/datetime";
import { formatFromPrice, useUpcomingEvents } from "@/lib/hooks/useUpcomingEvents";

// Admin-picked feature (see PUT /api/v1/events/featured). Renders nothing when unset.
export function EventOfTheMonth() {
  const [event, setEvent] = useState<Event | null>(null);
  const { data } = useUpcomingEvents();

  useEffect(() => {
    let cancelled = false;
    getFeaturedEvent()
      .then((result) => !cancelled && setEvent(result))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!event) {
    return null;
  }

  const start = new Date(event.startAt);
  const month = start.toLocaleDateString(undefined, { month: "long" });
  const dateLabel = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeLabel = `${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}${miamiTimeSuffix(event.startAt)}`;
  const fromPrice = formatFromPrice(data?.lowestPriceCents[event.id]);
  const venue = event.venue && event.venue !== "TBD" ? event.venue : null;
  const description = event.description?.trim();
  const showDescription =
    Boolean(description) && description !== "User-submitted event pending schedule confirmation.";

  return (
    <section aria-labelledby="eotm-heading" className="relative isolate overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]">
      {event.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.imageUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      ) : null}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(13,13,13,0.96)_0%,rgba(13,13,13,0.85)_45%,rgba(13,13,13,0.35)_100%)]" />
      <div className="grid gap-8 p-6 sm:p-12 md:max-w-2xl">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">{month} pick</p>
          <h2 id="eotm-heading" className="brand-heading mt-2 text-5xl font-extrabold uppercase leading-[0.9] text-[var(--foreground)] sm:text-7xl">
            Event of
            <br />
            the <span className="brand-gradient-text">month</span>
          </h2>
        </div>
        <div className="grid gap-2">
          <h3 className="text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">{event.title}</h3>
          <p className="text-sm text-[var(--silver)] sm:text-base">
            <span className="tabular text-[var(--blue-soft)]">{dateLabel} · {timeLabel}</span>
            {venue ? <> · {venue}, {event.city}</> : <> · {event.city}</>}
          </p>
          {showDescription ? (
            <p className="line-clamp-3 max-w-lg text-sm leading-6 text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={`/events/${event.id}`}
            className="inline-flex h-11 items-center rounded-full bg-[var(--foreground)] px-6 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-zinc-200"
          >
            {fromPrice ? `Tickets from ${fromPrice}` : "View event"}
          </Link>
        </div>
      </div>
    </section>
  );
}
