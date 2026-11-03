"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Event } from "@/lib/api/events";
import { miamiTimeSuffix } from "@/lib/datetime";
import { listEvents } from "@/lib/api/events";

interface EventsCarouselProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  autoAdvanceMs?: number;
}

export function EventsCarousel({
  title = "Upcoming events",
  subtitle = "",
  limit = 10,
  autoAdvanceMs = 9000
}: EventsCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const response = await listEvents({ limit });
        if (!cancelled) {
          setEvents(response);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Could not load events.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  const scrollByCards = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>("[data-carousel-card]");
    const cardWidth = firstCard?.offsetWidth ?? 280;
    const gap = 16;
    track.scrollBy({ left: direction * (cardWidth + gap), behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isPaused || !events.length || autoAdvanceMs <= 0) {
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
  }, [autoAdvanceMs, events.length, isPaused, scrollByCards]);

  const pauseCarousel = useCallback(() => setIsPaused(true), []);
  const resumeCarousel = useCallback(() => setIsPaused(false), []);

  return (
    <section
      className="grid gap-4"
      onMouseEnter={pauseCarousel}
      onMouseLeave={resumeCarousel}
      onTouchStart={pauseCarousel}
      onTouchEnd={resumeCarousel}
      onTouchCancel={resumeCarousel}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="brand-heading text-2xl font-bold text-[var(--foreground)] sm:text-3xl">{title}</h2>
          {subtitle ? <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/events"
            className="mr-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            View all →
          </Link>
          <button
            type="button"
            aria-label="Scroll previous"
            onClick={() => scrollByCards(-1)}
            className="hidden h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--silver)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-white sm:inline-flex"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            aria-label="Scroll next"
            onClick={() => scrollByCards(1)}
            className="hidden h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--silver)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] hover:text-white sm:inline-flex"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="scrollbar-none -mx-[3vw] flex gap-4 overflow-hidden px-[3vw] sm:mx-0 sm:px-0">
          {Array.from({ length: 4 }).map((_unused, index) => (
            <div
              key={index}
              className="h-72 w-[min(280px,85vw)] shrink-0 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]"
            />
          ))}
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <p className="muted-text text-sm">{errorMessage}</p>
      ) : null}

      {!isLoading && !errorMessage && !events.length ? (
        <p className="muted-text text-sm">No upcoming events yet.</p>
      ) : null}

      {!isLoading && events.length ? (
        <div
          ref={trackRef}
          className="scrollbar-none -mx-[3vw] flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[3vw] pb-2 sm:mx-0 sm:px-0"
        >
          {events.map((event) => {
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
            return (
              <Link
                key={event.id}
                data-carousel-card
                href={`/events/${event.id}`}
                className="group grid w-[min(260px,78vw)] shrink-0 snap-start gap-3 rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <div className="aspect-square w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)]">
                  {event.imageUrl ? (
                    <img
                      alt={`${event.title} event image`}
                      src={event.imageUrl}
                      className="h-full w-full object-cover transition-opacity duration-150 group-hover:opacity-90"
                    />
                  ) : null}
                </div>
                <div className="grid gap-0.5">
                  <p className="tabular text-xs text-[var(--accent)]">
                    {dateLabel} · {timeLabel}
                  </p>
                  <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--foreground)] group-hover:underline group-hover:decoration-[var(--border-strong)] group-hover:underline-offset-4">
                    {event.title}
                  </h3>
                  <p className="line-clamp-1 text-sm text-[var(--muted)]">
                    {event.venue && event.venue !== "TBD" ? event.venue : "Venue TBD"}
                    {event.city ? `, ${event.city}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
