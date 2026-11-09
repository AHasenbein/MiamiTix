"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { miamiTimeSuffix } from "@/lib/datetime";
import { formatFromPrice, useUpcomingEvents } from "@/lib/hooks/useUpcomingEvents";

function useCountdown(targetIso: string | undefined) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);
  if (!targetIso || now === null) return null;
  const totalSeconds = Math.floor(Math.max(0, new Date(targetIso).getTime() - now) / 1000);
  return [
    { unit: "d", label: "days", value: Math.floor(totalSeconds / 86400) },
    { unit: "h", label: "hours", value: Math.floor((totalSeconds % 86400) / 3600) },
    { unit: "m", label: "minutes", value: Math.floor((totalSeconds % 3600) / 60) },
    { unit: "s", label: "seconds", value: totalSeconds % 60 }
  ];
}

// Stub height must match --notch-y so the notches line up with the tear line.
const STUB_HEIGHT = "9.5rem";

/** The soonest upcoming event, drawn as a tear-off ticket with a live countdown. */
export function NextEventTicket() {
  const { data, isLoading } = useUpcomingEvents();
  const event = data?.events[0];
  const countdown = useCountdown(event?.startAt);

  if (isLoading) {
    return <div className="h-[30rem] animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface)]" />;
  }
  if (!event) {
    return null;
  }

  const start = new Date(event.startAt);
  const dateLabel = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeLabel = `${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}${miamiTimeSuffix(event.startAt)}`;
  const fromPrice = formatFromPrice(data?.lowestPriceCents[event.id]);
  const venue = event.venue && event.venue !== "TBD" ? event.venue : event.city;

  return (
    <article
      aria-labelledby="next-event-title"
      className="ticket grid overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]"
      style={{ "--notch-y": `calc(100% - ${STUB_HEIGHT})` } as CSSProperties}
    >
      <div className="grid gap-4 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand-pink)]">Featured ticket</p>
        <Link href={`/events/${event.id}`} tabIndex={-1} className="block aspect-[16/10] overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface)]">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt={`${event.title} event image`} className="h-full w-full object-cover" />
          ) : null}
        </Link>
        <div>
          <h2 id="next-event-title" className="brand-heading text-2xl font-bold leading-tight text-[var(--foreground)]">
            <Link href={`/events/${event.id}`} className="hover:underline hover:decoration-[var(--border-strong)] hover:underline-offset-4">
              {event.title}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            <span className="tabular text-[var(--blue-soft)]">{dateLabel} · {timeLabel}</span>
            <br />
            {venue}
          </p>
        </div>
      </div>

      <div
        className="perforation mx-4 grid content-center gap-4 border-t-2 sm:mx-5"
        style={{ height: STUB_HEIGHT }}
      >
        <p className="tabular flex items-baseline gap-3 text-[var(--foreground)]" aria-label="Time until doors">
          {(countdown ?? []).map((part) => (
            <span key={part.unit} aria-label={`${part.value} ${part.label}`}>
              <span className="text-2xl font-semibold">{String(part.value).padStart(2, "0")}</span>
              <span className="ml-0.5 text-xs text-[var(--subtle)]">{part.unit}</span>
            </span>
          ))}
          {!countdown ? <span className="text-2xl font-semibold text-[var(--subtle)]">--</span> : null}
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            {fromPrice ? (
              <>
                from <span className="tabular text-lg font-semibold text-[var(--foreground)]">{fromPrice}</span>
              </>
            ) : (
              "No tickets listed yet"
            )}
          </p>
          <Link
            href={`/events/${event.id}`}
            className="inline-flex h-10 items-center rounded-full bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-zinc-200"
          >
            {fromPrice ? "Get tickets" : "View event"}
          </Link>
        </div>
      </div>
    </article>
  );
}
