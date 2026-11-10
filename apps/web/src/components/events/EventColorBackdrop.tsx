"use client";

import { hsl, useImagePalette } from "@/lib/hooks/useImagePalette";

/**
 * The event image's two main colors as a gradient filling the page behind the cards.
 * Stays plain black until the colors are sampled (or if they can't be).
 * The parent needs `isolate` so this sits above the body background.
 */
export function EventColorBackdrop({ imageUrl }: { imageUrl: string | undefined }) {
  const palette = useImagePalette(imageUrl);
  if (!palette) return null;
  const { first, second } = palette;
  // Dark enough that white text and the dark cards stay readable on top.
  const colorA = hsl(first.h, Math.min(first.s, 0.6), 0.22);
  const colorB = hsl(second.h, Math.min(second.s, 0.6), 0.2);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background: `linear-gradient(160deg, ${colorA}, ${colorB})`
      }}
    />
  );
}
