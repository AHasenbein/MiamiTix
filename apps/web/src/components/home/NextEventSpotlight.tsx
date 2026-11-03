"use client";

import Link from "next/link";
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
  const remaining = Math.max(0, new Date(targetIso).getTime() - now);
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

export function NextEventSpotlight() {
  const { data, isLoading } = useUpcomingEvents();
  const event = data?.events[0];
  const countdown = useCountdown(event?.startAt);

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface)]" />;
  }
  if (!event) {
    return null;
  }

  const start = new Date(event.startAt);
  const dateLabel = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeLabel = `${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}${miamiTimeSuffix(event.startAt)}`;
  const fromPrice = formatFromPrice(data?.lowestPriceCents[event.id]);
  const venue = event.venue && event.venue !== "TBD" ? event.venue : null;

  return (
    <section aria-labelledby="next-event-heading" className="gradient-ring rounded-[var(--radius-lg)]">
      <div className="grid overflow-hidden rounded-[calc(var(--radius-lg)-1px)] bg-[var(--surface)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Link href={`/events/${event.id}`} className="block aspect-[4/3] bg-[var(--surface-elevated)] md:aspect-auto" tabIndex={-1}>
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt={`${event.title} event image`} className="h-full w-full object-cover" />
          ) : null}
        </Link>
        <div className="flex flex-col justify-between gap-6 p-5 sm:p-8">
          <div className="grid gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-[var(--accent)]">
              <span className="live-dot h-2 w-2 rounded-full bg-[var(--pink)]" aria-hidden="true" />
              Next event
            </p>
            <h2 id="next-event-heading" className="brand-heading text-3xl font-bold leading-tight text-[var(--foreground)] sm:text-5xl">
              <Link href={`/events/${event.id}`} className="hover:underline hover:decoration-[var(--border-strong)] hover:underline-offset-8">
                {event.title}
              </Link>
            </h2>
            <p className="text-sm text-[var(--muted)] sm:text-base">
              <span className="tabular text-[var(--blue-soft)]">{dateLabel} · {timeLabel}</span>
              {venue ? <> · {venue}, {event.city}</> : <> · {event.city}</>}
            </p>
          </div>

          <dl className="grid grid-cols-4 gap-2 sm:max-w-md" aria-label="Time until doors">
            {(["days", "hours", "minutes", "seconds"] as const).map((unit) => (
              <div key={unit} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-2 py-3 text-center">
                <dd className="tabular text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">
                  {countdown ? pad(countdown[unit]) : "--"}
                </dd>
                <dt className="mt-0.5 text-[11px] capitalize text-[var(--subtle)]">{unit}</dt>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-5">
            <p className="text-sm text-[var(--muted)]">
              {fromPrice ? (
                <>
                  From <span className="tabular text-xl font-semibold text-[var(--foreground)]">{fromPrice}</span>
                </>
              ) : (
                "No tickets listed yet"
              )}
            </p>
            <Link
              href={`/events/${event.id}`}
              className="inline-flex h-11 items-center rounded-full bg-[var(--foreground)] px-6 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-zinc-200"
            >
              {fromPrice ? "Get tickets" : "View event"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
