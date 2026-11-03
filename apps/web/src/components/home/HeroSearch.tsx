"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      role="search"
      className="gradient-ring mx-auto w-full max-w-xl rounded-full"
      onSubmit={(event) => {
        event.preventDefault();
        const q = query.trim();
        router.push(q ? `/events?q=${encodeURIComponent(q)}` : "/events");
      }}
    >
      <label className="flex h-13 items-center gap-3 rounded-full bg-[var(--surface)] px-5 sm:h-14">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="round" />
        </svg>
        <span className="sr-only">Search events</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by event, artist, or venue"
          className="h-full min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--subtle)]"
        />
        <button
          type="submit"
          className="hidden rounded-full bg-[var(--foreground)] px-4 py-1.5 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-zinc-200 sm:block"
        >
          Search
        </button>
      </label>
    </form>
  );
}
