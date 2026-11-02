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
  title = "Discover events",
  subtitle = "Hand-picked nights, just-dropped lineups, and trending listings.",
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
          setErrorMessage("Could not load discovery feed.");
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
          <span className="brand-pill">
            <span className="dot" />
            Featured tonight
          </span>
          <h2 className="brand-heading mt-3 text-2xl font-semibold sm:text-4xl">{title}</h2>
          <p className="muted-text mt-1 max-w-xl text-sm">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Scroll previous"
            onClick={() => scrollByCards(-1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[rgba(232,235,243,0.06)] text-lg text-[var(--silver)] transition active:scale-95 hover:border-[rgba(34,211,255,0.55)] hover:bg-[rgba(34,211,255,0.1)] hover:text-white hover:shadow-[0_0_18px_rgba(34,211,255,0.45)]"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            aria-label="Scroll next"
            onClick={() => scrollByCards(1)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[rgba(232,235,243,0.06)] text-lg text-[var(--silver)] transition active:scale-95 hover:border-[rgba(255,46,168,0.55)] hover:bg-[rgba(255,46,168,0.1)] hover:text-white hover:shadow-[0_0_18px_rgba(255,46,168,0.45)]"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="scrollbar-none -mx-[3vw] flex gap-4 overflow-hidden px-[3vw] sm:mx-0 sm:px-0">
          {Array.from({ length: 4 }).map((_unused, index) => (
            <div
              key={index}
              className="h-72 w-[min(280px,85vw)] shrink-0 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[rgba(232,235,243,0.06)]"
            />
          ))}
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <p className="muted-text text-sm">{errorMessage}</p>
      ) : null}

      {!isLoading && !errorMessage && !events.length ? (
        <p className="muted-text text-sm">No events to feature yet — be the first to add one.</p>
      ) : null}

      {!isLoading && events.length ? (
        <div
          ref={trackRef}
          className="scrollbar-none -mx-[3vw] flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[3vw] pb-2 sm:mx-0 sm:px-0"
        >
          {events.map((event) => {
            const startDate = new Date(event.startAt);
            const dateLabel = startDate.toLocaleDateString(undefined, {
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
                className="group relative w-[min(280px,85vw)] shrink-0 snap-start overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[linear-gradient(160deg,rgba(24,18,48,0.85),rgba(14,10,28,0.95))] transition active:scale-[0.99] hover:-translate-y-0.5 hover:border-[rgba(255,46,168,0.55)] hover:shadow-[0_18px_46px_rgba(255,46,168,0.28),0_0_0_1px_rgba(34,211,255,0.25)]"
              >
                <div className="relative aspect-[5/4] w-full overflow-hidden">
                  {event.imageUrl ? (
                    <img
                      alt={`${event.title} event image`}
                      src={event.imageUrl}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="h-full w-full bg-[linear-gradient(135deg,rgba(255,46,168,0.3),rgba(34,211,255,0.25))]" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,6,15,0)_45%,rgba(7,6,15,0.85)_100%)]" />
                  <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(7,6,15,0.6)] px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--silver)] backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-pink)] shadow-[0_0_8px_rgba(255,46,168,0.9)]" />
                    {event.city}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 grid gap-1">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--neon-blue-soft)]">
                      {dateLabel} · {timeLabel}
                    </p>
                    <h3 className="brand-heading line-clamp-2 text-lg font-semibold leading-tight text-white">
                      {event.title}
                    </h3>
                  </div>
                </div>
                <div className="grid gap-1 px-4 py-3">
                  {event.artists.length ? (
                    <p className="line-clamp-1 text-xs text-[var(--silver)]">
                      {event.artists.join(", ")}
                    </p>
                  ) : null}
                  <p className="muted-text line-clamp-1 text-xs">
                    {event.venue && event.venue !== "TBD" ? event.venue : "Venue TBD"}
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
