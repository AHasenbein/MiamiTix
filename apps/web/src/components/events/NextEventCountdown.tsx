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

  return (
    <Link
      href={`/events/${nextEvent.id}`}
      className="brand-pill w-fit gap-2.5 !text-white transition hover:!border-[rgba(255,46,168,0.55)] hover:!bg-[rgba(255,46,168,0.12)]"
      aria-label={`Next event: ${headlineArtist}`}
    >
      <span aria-hidden="true" className="flex items-end gap-[3px]">
        <span className="eq-bar" />
        <span className="eq-bar" />
        <span className="eq-bar" />
        <span className="eq-bar" />
      </span>
      <span>Next event</span>
      <span className="font-semibold text-white">{headlineArtist}</span>
    </Link>
  );
}
