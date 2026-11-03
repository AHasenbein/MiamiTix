"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Event } from "@/lib/api/events";
import { listEvents } from "@/lib/api/events";

function pickHeadlineArtist(event: Event): string {
  const firstRaw = event.artists[0]?.split(",")[0]?.trim();
  if (firstRaw) {
    return firstRaw;
  }
  return event.title.split(",")[0]?.trim() ?? event.title;
}

export function NextEventCountdown() {
  const [nextEvent, setNextEvent] = useState<Event | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const response = await listEvents({ limit: 20 });
        if (!cancelled) {
          const now = Date.now();
          const upcoming = response
            .filter((event) => new Date(event.startAt).getTime() > now)
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
          setNextEvent(upcoming[0] ?? null);
        }
      } catch {
        // Pill simply hides itself if we can't load events.
      }
    }

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!nextEvent) {
    return null;
  }

  const headlineArtist = pickHeadlineArtist(nextEvent);

  const dateLabel = new Date(nextEvent.startAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  return (
    <Link
      href={`/events/${nextEvent.id}`}
      className="group inline-flex w-fit items-center gap-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      aria-label={`Next event: ${headlineArtist}`}
    >
      <span className="text-[var(--subtle)]">Next up</span>
      <span className="font-medium text-[var(--foreground)]">{headlineArtist}</span>
      <span className="tabular text-xs text-[var(--subtle)]">
        {dateLabel}
      </span>
      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
    </Link>
  );
}
