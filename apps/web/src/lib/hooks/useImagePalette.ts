"use client";

import { useEffect, useState } from "react";

type Rgb = [number, number, number];

/** A hue (0–360) and saturation (0–1) picked out of an image. */
export interface SampledHue {
  h: number;
  s: number;
}

/** CSS hsl() string; s and l are 0–1. */
export const hsl = (h: number, s: number, l: number) =>
  `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

/** Ask Cloudinary for a tiny thumbnail; other hosts get the original. */
function thumbnailUrl(url: string) {
  return url.includes("res.cloudinary.com") && url.includes("/upload/")
    ? url.replace("/upload/", "/upload/w_48,h_48,c_fill/")
    : url;
}

/**
 * The most prominent vivid hues in the image, strongest first.
 * Pixels are grouped into 12 hue buckets weighted by saturation, so a big grey area doesn't win.
 */
function dominantHues(pixels: Uint8ClampedArray): SampledHue[] {
  const buckets = Array.from({ length: 12 }, () => ({ weight: 0, x: 0, y: 0, s: 0 }));
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const [h, s, l] = rgbToHsl([pixels[i], pixels[i + 1], pixels[i + 2]]);
    if (s < 0.2 || l < 0.12 || l > 0.9) continue;
    const bucket = buckets[Math.floor(h / 30) % 12];
    const w = s;
    bucket.weight += w;
    // Average hue on the circle so reds at 355° and 5° don't average to cyan.
    bucket.x += Math.cos((h * Math.PI) / 180) * w;
    bucket.y += Math.sin((h * Math.PI) / 180) * w;
    bucket.s += s * w;
  }
  return buckets
    .filter((b) => b.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((b) => ({
      h: ((Math.atan2(b.y, b.x) * 180) / Math.PI + 360) % 360,
      s: b.s / b.weight
    }));
}

/**
 * Samples the two strongest colors of an image in the browser.
 * Returns null until loaded, or if the image has no vivid color or its host blocks
 * cross-origin reads (callers keep their default colors then).
 */
export function useImagePalette(imageUrl: string | undefined | null) {
  const [palette, setPalette] = useState<{ url: string; first: SampledHue; second: SampledHue } | null>(
    null
  );

  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 48;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const hues = dominantHues(ctx.getImageData(0, 0, size, size).data);
        if (!hues.length) return;
        setPalette({ url: imageUrl, first: hues[0], second: hues[1] ?? hues[0] });
      } catch {
        // Cross-origin read refused: leave the palette empty.
      }
    };
    img.src = thumbnailUrl(imageUrl);
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // Ignore a palette left over from a previous image.
  return palette && palette.url === imageUrl ? palette : null;
}
