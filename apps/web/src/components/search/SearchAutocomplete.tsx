"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Event } from "@/lib/api/events";
import { listArtistSuggestions, listEvents } from "@/lib/api/events";
import { formatFromPrice, useUpcomingEvents } from "@/lib/hooks/useUpcomingEvents";

interface SearchAutocompleteProps {
  /** Starting text (e.g. the current ?q= on /events). */
  initialQuery?: string;
  /** Called on Enter / Search with no suggestion highlighted. Defaults to /events?q=. */
  onSearch?: (query: string) => void;
  placeholder?: string;
  size?: "md" | "lg";
  className?: string;
}

type Option =
  | { kind: "event"; key: string; event: Event }
  | { kind: "artist"; key: string; artist: string }
  | { kind: "all"; key: string };

const MIN_CHARS = 2;
const DEBOUNCE_MS = 180;

/** Search field with a live dropdown of matching events and artists. */
export function SearchAutocomplete({
  initialQuery = "",
  onSearch,
  placeholder = "Artist, venue, or event",
  size = "md",
  className = ""
}: SearchAutocompleteProps) {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { data: upcoming } = useUpcomingEvents();
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [results, setResults] = useState<{ query: string; events: Event[]; artists: string[] } | null>(null);
  const [loadingQuery, setLoadingQuery] = useState<string | null>(null);

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_CHARS) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoadingQuery(trimmed);
      Promise.all([
        listEvents({ query: trimmed, limit: 5 }).catch(() => [] as Event[]),
        listArtistSuggestions(trimmed, 3).catch(() => [] as string[])
      ]).then(([events, artists]) => {
        if (cancelled) return;
        setResults({ query: trimmed, events, artists });
        setLoadingQuery(null);
        setActiveIndex(-1);
      });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  // Only show results that belong to what's in the box right now.
  const current = trimmed.length >= MIN_CHARS && results?.query === trimmed ? results : null;
  const isLoading = trimmed.length >= MIN_CHARS && !current && loadingQuery !== null;

  const options = useMemo<Option[]>(() => {
    if (!current) return [];
    const eventTitles = new Set(current.events.map((event) => event.title.toLowerCase()));
    return [
      ...current.events.map((event) => ({ kind: "event" as const, key: `e-${event.id}`, event })),
      ...current.artists
        .filter((artist) => !eventTitles.has(artist.toLowerCase()))
        .map((artist) => ({ kind: "artist" as const, key: `a-${artist}`, artist })),
      { kind: "all" as const, key: "all" }
    ];
  }, [current]);

  const showDropdown = isOpen && trimmed.length >= MIN_CHARS && (options.length > 0 || isLoading);

  function runSearch(text: string) {
    setIsOpen(false);
    const value = text.trim();
    if (onSearch) {
      onSearch(value);
    } else {
      router.push(value ? `/events?q=${encodeURIComponent(value)}` : "/events");
    }
  }

  function choose(option: Option) {
    setIsOpen(false);
    if (option.kind === "event") {
      router.push(`/events/${option.event.id}`);
    } else if (option.kind === "artist") {
      setQuery(option.artist);
      runSearch(option.artist);
    } else {
      runSearch(trimmed);
    }
  }

  const height = size === "lg" ? "h-12" : "h-10";

  return (
    <div className={`relative w-full ${className}`}>
      <form
        role="search"
        className="flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] py-1 pl-5 pr-1 transition-colors focus-within:border-[var(--pink)]"
        onSubmit={(formEvent) => {
          formEvent.preventDefault();
          const active = options[activeIndex];
          if (showDropdown && active) {
            choose(active);
          } else {
            runSearch(trimmed);
          }
        }}
      >
        <label htmlFor={`${listboxId}-input`} className="sr-only">
          Search events
        </label>
        <input
          ref={inputRef}
          id={`${listboxId}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={showDropdown && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(changeEvent) => {
            setQuery(changeEvent.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onKeyDown={(keyEvent) => {
            if (keyEvent.key === "ArrowDown" && options.length) {
              keyEvent.preventDefault();
              setIsOpen(true);
              setActiveIndex((index) => (index + 1) % options.length);
            } else if (keyEvent.key === "ArrowUp" && options.length) {
              keyEvent.preventDefault();
              setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1));
            } else if (keyEvent.key === "Escape") {
              setIsOpen(false);
              setActiveIndex(-1);
            }
          }}
          className={`${height} min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--subtle)]`}
        />
        {initialQuery && onSearch ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              runSearch("");
            }}
            className={`${height} rounded-full px-3 text-sm text-[var(--muted)] hover:text-white`}
          >
            Clear
          </button>
        ) : null}
        <button
          type="submit"
          className={`${height} rounded-full bg-[var(--foreground)] px-5 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-zinc-200`}
        >
          Search
        </button>
      </form>

      {showDropdown ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-elevated)] py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
        >
          {isLoading && !options.length ? (
            <li className="px-4 py-3 text-sm text-[var(--subtle)]" aria-live="polite">
              Searching…
            </li>
          ) : null}
          {current && current.events.length === 0 && current.artists.length === 0 ? (
            <li className="px-4 pb-1 pt-2 text-xs text-[var(--subtle)]">No upcoming events match yet.</li>
          ) : null}
          {options.map((option, index) => {
            const active = index === activeIndex;
            const rowClass = `flex cursor-pointer items-center gap-3 px-3 py-2 ${active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"}`;
            const shared = {
              id: `${listboxId}-${index}`,
              role: "option" as const,
              "aria-selected": active,
              // Keep focus in the input so blur doesn't close the list before the click lands.
              onMouseDown: (mouseEvent: MouseEvent) => mouseEvent.preventDefault(),
              onMouseEnter: () => setActiveIndex(index),
              onClick: () => choose(option)
            };

            if (option.kind === "event") {
              const { event } = option;
              const start = new Date(event.startAt);
              const price = formatFromPrice(upcoming?.lowestPriceCents[event.id]);
              return (
                <li key={option.key} {...shared} className={rowClass}>
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--surface)]">
                    {event.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Highlight text={event.title} query={trimmed} />
                    <span className="block truncate text-xs text-[var(--muted)]">
                      <span className="tabular text-[var(--blue-soft)]">
                        {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      {event.venue && event.venue !== "TBD" ? ` · ${event.venue}` : ""}
                    </span>
                  </span>
                  {price ? (
                    <span className="tabular shrink-0 text-sm text-[var(--muted)]">
                      from <span className="font-semibold text-[var(--foreground)]">{price}</span>
                    </span>
                  ) : null}
                </li>
              );
            }

            if (option.kind === "artist") {
              return (
                <li key={option.key} {...shared} className={rowClass}>
                  <span className="grid h-10 w-10 shrink-0 place-content-center rounded-full border border-[var(--border-strong)] text-xs text-[var(--pink-soft)]" aria-hidden="true">
                    ♪
                  </span>
                  <span className="min-w-0 flex-1">
                    <Highlight text={option.artist} query={trimmed} />
                    <span className="block text-xs text-[var(--muted)]">Artist</span>
                  </span>
                </li>
              );
            }

            return (
              <li key={option.key} {...shared} className={`${rowClass} mt-1 border-t border-[var(--border)] pt-2.5 text-sm text-[var(--silver)]`}>
                See all results for “{trimmed}” →
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** Bolds the part of `text` that matches the query. */
function Highlight({ text, query }: { text: string; query: string }) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0 || !query) {
    return <span className="block truncate text-sm text-[var(--foreground)]">{text}</span>;
  }
  return (
    <span className="block truncate text-sm text-[var(--silver)]">
      {text.slice(0, index)}
      <span className="font-semibold text-[var(--foreground)]">{text.slice(index, index + query.length)}</span>
      {text.slice(index + query.length)}
    </span>
  );
}
