"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
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
    <section aria-labelledby="eotm-heading" className="grid gap-5">
      <h2 id="eotm-heading" className="display-heading text-xl font-extrabold uppercase text-[var(--foreground)] sm:text-3xl">
        Event of the Month
      </h2>
      <article
        className="ticket ticket-x grid overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-elevated)] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_12rem]"
        style={{ "--notch-y": "calc(100% - 8rem)", "--notch-x": "calc(100% - 12rem)" } as CSSProperties}
      >
        <Link href={`/events/${event.id}`} tabIndex={-1} className="block aspect-[16/10] bg-[var(--surface)] md:aspect-auto md:min-h-80">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt={`${event.title} event image`} className="h-full w-full object-cover" />
          ) : null}
        </Link>

        <div className="grid content-center gap-3 p-6 sm:p-8">
          <p className="text-sm font-medium text-[var(--pink-soft)]">{month}&apos;s pick</p>
          <h3 className="brand-heading text-3xl font-bold leading-tight text-[var(--foreground)] sm:text-4xl">
            <Link href={`/events/${event.id}`} className="hover:underline hover:decoration-[var(--border-strong)] hover:underline-offset-4">
              {event.title}
            </Link>
          </h3>
          <p className="text-sm text-[var(--muted)] sm:text-base">
            <span className="tabular text-[var(--blue-soft)]">{dateLabel} · {timeLabel}</span>
            <br />
            {venue ? `${venue}, ${event.city}` : event.city}
          </p>
          {showDescription ? (
            <p className="line-clamp-3 max-w-lg text-sm leading-6 text-[var(--muted)]">{description}</p>
          ) : null}
        </div>

        <div className="perforation mx-6 flex h-32 items-center justify-between gap-4 border-t-2 md:mx-0 md:my-6 md:h-auto md:flex-col md:justify-center md:border-l-2 md:border-t-0 md:px-5 md:text-center">
          <div>
            <p className="tabular text-xs text-[var(--subtle)]">{start.toLocaleDateString(undefined, { month: "short" })}</p>
            <p className="tabular text-4xl font-semibold leading-none text-[var(--foreground)]">
              {String(start.getDate()).padStart(2, "0")}
            </p>
          </div>
          <Link
            href={`/events/${event.id}`}
            className="inline-flex h-10 items-center whitespace-nowrap rounded-full bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-zinc-200"
          >
            {fromPrice ? `From ${fromPrice}` : "View event"}
          </Link>
        </div>
      </article>
    </section>
  );
}
