"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { miamiTimeSuffix } from "@/lib/datetime";
import { formatFromPrice, useUpcomingEvents } from "@/lib/hooks/useUpcomingEvents";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

interface EventsCarouselProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  /** Auto-scroll interval. Pauses on hover/touch and for reduced-motion users. 0 disables. */
  autoAdvanceMs?: number;
}

export function EventsCarousel({
  title = "Upcoming events",
  subtitle = "",
  limit = 10,
  autoAdvanceMs = 5000
}: EventsCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const { data, error, isLoading } = useUpcomingEvents();
  const events = data?.events.slice(0, limit) ?? [];
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  const scrollByCards = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>("[data-carousel-card]");
    const cardWidth = firstCard?.offsetWidth ?? 300;
    track.scrollBy({ left: direction * (cardWidth + 16), behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isPaused || reduceMotion || !events.length || autoAdvanceMs <= 0) {
      return;
    }
    const interval = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      if (atEnd) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollByCards(1);
      }
    }, autoAdvanceMs);
    return () => window.clearInterval(interval);
  }, [autoAdvanceMs, events.length, isPaused, reduceMotion, scrollByCards]);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  return (
    <section
      className="grid gap-5"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
      onTouchCancel={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="display-heading text-xl font-extrabold uppercase text-[var(--foreground)] sm:text-3xl">{title}</h2>
          {subtitle ? <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/events" className="mr-1 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
            View all →
          </Link>
          {(["prev", "next"] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              aria-label={direction === "prev" ? "Scroll previous" : "Scroll next"}
              onClick={() => scrollByCards(direction === "prev" ? -1 : 1)}
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--silver)] transition-colors hover:border-[var(--pink)] hover:text-white sm:inline-flex"
            >
              <span aria-hidden="true">{direction === "prev" ? "←" : "→"}</span>
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="scrollbar-none -mx-[3vw] flex gap-4 overflow-hidden px-[3vw] sm:mx-0 sm:px-0">
          {Array.from({ length: 4 }).map((_unused, index) => (
            <div key={index} className="aspect-[4/3] w-[min(320px,80vw)] shrink-0 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface)]" />
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-[var(--muted)]">Could not load events.</p> : null}
      {!isLoading && !error && !events.length ? (
        <p className="text-sm text-[var(--muted)]">No upcoming events yet.</p>
      ) : null}

      {events.length ? (
        <div
          ref={trackRef}
          className="scrollbar-none -mx-[3vw] flex snap-x snap-mandatory scroll-px-[3vw] gap-4 overflow-x-auto scroll-smooth px-[3vw] pb-1 sm:mx-0 sm:scroll-px-0 sm:px-0"
        >
          {events.map((event) => {
            const fromPrice = formatFromPrice(data?.lowestPriceCents[event.id]);
            return (
              <Link
                key={event.id}
                data-carousel-card
                href={`/events/${event.id}`}
                className="group grid w-[min(320px,80vw)] shrink-0 snap-start gap-3 rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <div className="aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]">
                  {event.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`${event.title} event image`}
                      src={event.imageUrl}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <EventMeta
                  title={event.title}
                  startAt={event.startAt}
                  where={event.venue && event.venue !== "TBD" ? event.venue : event.city}
                  fromPrice={fromPrice}
                />
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

/** Card caption: calendar date tile, then title, time/venue and starting price. */
export function EventMeta({
  title,
  startAt,
  where,
  fromPrice
}: {
  title: string;
  startAt: string;
  where: string;
  fromPrice: string | null;
}) {
  const start = new Date(startAt);
  const time = `${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}${miamiTimeSuffix(startAt)}`;
  return (
    <div className="flex gap-3">
      <div
        className="tabular grid h-12 w-11 shrink-0 place-content-center rounded-[var(--radius-md)] border border-[var(--border-strong)] text-center leading-none"
        aria-hidden="true"
      >
        <span className="text-[10px] text-[var(--pink-soft)]">
          {start.toLocaleDateString(undefined, { month: "short" })}
        </span>
        <span className="mt-1 text-lg font-semibold text-[var(--foreground)]">{start.getDate()}</span>
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-1 text-base font-semibold text-[var(--foreground)]">{title}</h3>
        <p className="line-clamp-1 text-sm text-[var(--muted)]">
          <span className="tabular text-xs text-[var(--blue-soft)]">
            {start.toLocaleDateString(undefined, { weekday: "short" })} {time}
          </span>{" "}
          · {where}
        </p>
        <p className="mt-0.5 text-sm text-[var(--muted)]">
          {fromPrice ? (
            <>
              from <span className="tabular font-semibold text-[var(--foreground)]">{fromPrice}</span>
            </>
          ) : (
            <span className="text-[var(--subtle)]">No listings yet</span>
          )}
        </p>
      </div>
    </div>
  );
}
