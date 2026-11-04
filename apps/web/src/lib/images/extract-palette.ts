export type Rgb = [number, number, number];

export const PALETTE_SIZE = 5;

// Tix pink, violet and blue, used until photos load or when they have no usable colour.
export const FALLBACK_PALETTE: Rgb[] = [
  [1, 0.18, 0.66],
  [0.77, 0.42, 1],
  [0.13, 0.83, 1],
  [0.42, 0.3, 1],
  [1, 0.4, 0.77]
];

const MAX_IMAGES = 12;
const SAMPLE_SIZE = 32;
const HUE_BUCKETS = 12;
const MIN_SATURATION = 0.25;
const MIN_VALUE = 0.15;
const PALETTE_SATURATION = 0.9;

// Colour weight per hue bucket, each photo adding up to 1 so no single flyer dominates.
type HueWeights = number[];

const weightsByUrl = new Map<string, Promise<HueWeights | null>>();

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta + 6) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  return [hue / 6, max === 0 ? 0 : delta / max, max];
}

function hsvToRgb(h: number, s: number, v: number): Rgb {
  const channel = (n: number) => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [channel(5), channel(3), channel(1)];
}

// Sampling only needs a few pixels, so ask Cloudinary for a tiny copy of the photo.
function sampleUrl(url: string): string {
  return url.startsWith("https://res.cloudinary.com/")
    ? url.replace("/image/upload/", `/image/upload/w_${SAMPLE_SIZE},h_${SAMPLE_SIZE},c_fill/`)
    : url;
}

function readHueWeights(url: string): Promise<HueWeights | null> {
  return new Promise((resolve) => {
    const image = new Image();
    // Without CORS the canvas is tainted and its pixels can't be read.
    image.crossOrigin = "anonymous";
    image.onerror = () => resolve(null);
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const weights: HueWeights = new Array(HUE_BUCKETS).fill(0);
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          const [hue, saturation, value] = rgbToHsv(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
          if (saturation < MIN_SATURATION || value < MIN_VALUE) continue;
          const weight = saturation * value;
          weights[Math.floor(hue * HUE_BUCKETS) % HUE_BUCKETS] += weight;
          total += weight;
        }
        resolve(total > 0 ? weights.map((weight) => weight / total) : null);
      } catch {
        resolve(null);
      }
    };
    image.src = sampleUrl(url);
  });
}

function hueDistance(a: number, b: number): number {
  const distance = Math.abs(a - b);
  return Math.min(distance, HUE_BUCKETS - distance);
}

/** Picks the strongest, most distinct colours across the photos, ordered by hue so they blend cleanly. */
export async function extractPalette(urls: string[]): Promise<Rgb[]> {
  const results = await Promise.all(
    urls.slice(0, MAX_IMAGES).map((url) => {
      let weights = weightsByUrl.get(url);
      if (!weights) {
        weights = readHueWeights(url);
        weightsByUrl.set(url, weights);
      }
      return weights;
    })
  );

  const combined: HueWeights = new Array(HUE_BUCKETS).fill(0);
  for (const weights of results) {
    weights?.forEach((weight, bucket) => {
      combined[bucket] += weight;
    });
  }

  const ranked = combined
    .map((weight, bucket) => ({ weight, bucket }))
    .filter(({ weight }) => weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map(({ bucket }) => bucket);

  const picked: number[] = [];
  for (const bucket of ranked) {
    if (picked.length < PALETTE_SIZE && picked.every((other) => hueDistance(other, bucket) >= 2)) {
      picked.push(bucket);
    }
  }
  if (picked.length < 2) {
    return FALLBACK_PALETTE;
  }

  const colors = picked
    .sort((a, b) => a - b)
    .map((bucket) => hsvToRgb((bucket + 0.5) / HUE_BUCKETS, PALETTE_SATURATION, 1));
  return Array.from({ length: PALETTE_SIZE }, (_, index) => colors[index % colors.length]);
}
