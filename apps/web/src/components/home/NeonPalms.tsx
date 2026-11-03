// Neon palm trees arcing into the hero from off-screen trunks at both bottom corners.
// Classic palm silhouette (curved tapered trunk, broad rounded arching fronds) rendered
// as a glowing tube outline with a translucent fill.
// Shapes are generated once at module load from a few control points.

type Point = [number, number];

// Viewbox 260×470. The trunk comes in from past the bottom-left corner (clipped by the
// hero, so it runs off screen) and bends in a single arc up and over to the right,
// leaning into the page. Mirror for the right.
const CROWN: Point = [130, 150];
const TRUNK_BASE: Point = [-40, 560];
const TRUNK_CONTROL: Point = [-30, 170];

function quad(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]
  ];
}

function normalAt(p0: Point, p1: Point, p2: Point, t: number): Point {
  const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  const length = Math.hypot(dx, dy) || 1;
  return [-dy / length, dx / length];
}

const fmt = (p: Point) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/** Open smooth curve through points (Catmull-Rom as cubic Béziers), without the initial M. */
function smoothSegments(points: Point[]): string {
  let d = "";
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`;
  }
  return d;
}

/**
 * One frond: a full rounded blade arching from the crown out to a pointed tip.
 */
function frondPath(control: Point, tip: Point, width: number): string {
  // Put the broad side on whichever side of the rib faces up (the convex side of the arch).
  const mid = normalAt(CROWN, control, tip, 0.5);
  const side = mid[1] <= 0 ? 1 : -1;
  const offset = (t: number, amount: number): Point => {
    const [x, y] = quad(CROWN, control, tip, t);
    const [nx, ny] = normalAt(CROWN, control, tip, t);
    return [x + nx * amount * side, y + ny * amount * side];
  };
  const profile = (t: number) => width * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.65);

  const outer: Point[] = [];
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    outer.push(i === 12 ? tip : offset(t, profile(t)));
  }

  // Inner edge, tip back to crown: a gentle smooth curve just under the rib, so the
  // leaf reads as one full rounded blade.
  const inner: Point[] = [];
  for (let i = 11; i >= 1; i -= 1) {
    const t = i / 12;
    inner.push(offset(t, -profile(t) * 0.28));
  }
  inner.push(CROWN);

  return `M${fmt(CROWN)}${smoothSegments(outer)}${smoothSegments([tip, ...inner])} Z`;
}

/** Tapered trunk outline from the ground up to the crown. */
function trunkPath(): string {
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i <= 14; i += 1) {
    const t = i / 14;
    const [x, y] = quad(TRUNK_BASE, TRUNK_CONTROL, CROWN, t);
    const [nx, ny] = normalAt(TRUNK_BASE, TRUNK_CONTROL, CROWN, t);
    const half = 32 - 21 * Math.pow(t, 0.8);
    left.push([x + nx * half, y + ny * half]);
    right.push([x - nx * half, y - ny * half]);
  }
  right.reverse();
  return `M${fmt(left[0])}${smoothSegments(left)} L${fmt(right[0])}${smoothSegments(right)} Z`;
}

// [control point, tip, blade width] relative to the crown, traced from a classic palm
// silhouette.
const FROND_SCALE = 0.9;
const FRONDS: Array<[Point, Point, number]> = (
  [
    [[-8, -70], [-65, -72], 17],
    [[-62, -40], [-118, 0], 19],
    [[-76, 0], [-93, 72], 17],
    [[54, -52], [104, -15], 19],
    [[86, -2], [97, 72], 17],
    [[44, 22], [22, 104], 14]
  ] as Array<[Point, Point, number]>
).map(([control, tip, width]) => [
  [CROWN[0] + control[0] * FROND_SCALE, CROWN[1] + control[1] * FROND_SCALE],
  [CROWN[0] + tip[0] * FROND_SCALE, CROWN[1] + tip[1] * FROND_SCALE],
  width * FROND_SCALE
]);

const FRONDS_D = FRONDS.map(([control, tip, width]) => frondPath(control, tip, width));
const TRUNK_D = trunkPath();

interface PalmProps {
  className?: string;
  tone: "pink" | "blue";
  flicker?: boolean;
}

// Mirror with -scale-x-100 for the right-hand side.
function Palm({ className = "", tone, flicker = false }: PalmProps) {
  return (
    <svg
      viewBox="0 0 260 470"
      overflow="visible"
      className={`neon-palm neon-palm-${tone} ${flicker ? "neon-flicker" : ""} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <path className="neon-palm-fill" d={TRUNK_D} strokeWidth="2.6" />
      {FRONDS_D.map((d) => (
        <path key={d} className="neon-palm-fill" d={d} strokeWidth="2.6" />
      ))}
    </svg>
  );
}

export function NeonPalms() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden min-[1360px]:block" aria-hidden="true">
      {/* trunks run off the bottom corners and arc in over the hero */}
      <Palm tone="blue" className="absolute bottom-0 left-[-2rem] h-[88%] w-auto" flicker />
      <Palm tone="pink" className="absolute bottom-0 right-[-2rem] h-[88%] w-auto -scale-x-100" />
    </div>
  );
}
