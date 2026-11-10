"use client";

import { useEffect } from "react";
import { hsl, useImagePalette } from "@/lib/hooks/useImagePalette";
import { useUpcomingEvents } from "@/lib/hooks/useUpcomingEvents";

/** CSS variables this sets on <html>; the header and ticker read them with fallbacks. */
const VARS = ["--feature-dark", "--feature-dark-2", "--feature-accent", "--feature-light"] as const;

/**
 * Samples colors from the featured ticket's image and exposes them as CSS variables,
 * so the header and the scrolling event strip pick up the event's colors on the homepage.
 * Renders nothing; removes the variables when the homepage unmounts.
 */
export function FeaturedPalette() {
  const { data } = useUpcomingEvents();
  const palette = useImagePalette(data?.events[0]?.imageUrl);

  useEffect(() => {
    if (!palette) return;
    const root = document.documentElement;
    const { first, second } = palette;
    // Dark tones for backgrounds (white text stays readable), bright tones for text.
    root.style.setProperty("--feature-dark", hsl(first.h, Math.min(first.s, 0.6), 0.18));
    root.style.setProperty("--feature-dark-2", hsl(second.h, Math.min(second.s, 0.6), 0.2));
    root.style.setProperty("--feature-accent", hsl(second.h, Math.max(second.s, 0.75), 0.72));
    root.style.setProperty("--feature-light", hsl(first.h, 0.6, 0.92));
    return () => {
      for (const name of VARS) root.style.removeProperty(name);
    };
  }, [palette]);

  return null;
}
