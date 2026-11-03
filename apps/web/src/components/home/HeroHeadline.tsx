"use client";

import { useEffect, useMemo, useState } from "react";
import { useUpcomingEvents } from "@/lib/hooks/useUpcomingEvents";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

function headliner(title: string, artists: string[]): string {
  return (artists[0]?.split(",")[0] ?? title.split(",")[0] ?? title).trim();
}

// Types out the headliners of real upcoming events, one at a time.
export function HeroHeadline() {
  const { data } = useUpcomingEvents();
  const names = useMemo(() => {
    const unique = new Set<string>();
    for (const event of data?.events ?? []) {
      unique.add(headliner(event.title, event.artists));
      if (unique.size >= 6) break;
    }
    return [...unique];
  }, [data]);

  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  const current = names[index % Math.max(names.length, 1)] ?? "";

  useEffect(() => {
    if (!current || reduceMotion) return;
    let delay = deleting ? 45 : 85;
    if (!deleting && length === current.length) delay = 1800;
    if (deleting && length === 0) delay = 300;
    const timer = window.setTimeout(() => {
      if (!deleting && length === current.length) {
        setDeleting(true);
      } else if (deleting && length === 0) {
        setDeleting(false);
        setIndex((value) => value + 1);
      } else {
        setLength((value) => value + (deleting ? -1 : 1));
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [current, deleting, length, reduceMotion]);

  const shown = reduceMotion ? current : current.slice(0, length);

  return (
    <h1 className="brand-heading text-center text-[2.2rem] font-bold leading-[1.02] text-[var(--foreground)] sm:text-7xl">
      No fees. Just the night.
      <span className="mt-1 block min-h-[1.1em]">
        <span className="text-[var(--foreground)]">You&apos;re seeing </span>
        {current ? (
          <>
            <span className="brand-gradient-text">{shown}</span>
            <span
              aria-hidden="true"
              className="type-caret ml-0.5 inline-block h-[0.8em] w-[3px] translate-y-[0.08em] bg-[var(--pink)]"
            />
            <span className="sr-only">{current}</span>
          </>
        ) : (
          <span className="brand-gradient-text">Miami</span>
        )}
      </span>
    </h1>
  );
}
