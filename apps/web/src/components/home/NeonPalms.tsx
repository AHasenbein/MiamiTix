// Neon-tube palm trees that grow up from the hero's "ground" line at both page edges.
// Pure SVG strokes + CSS glow, decorative only.

interface PalmProps {
  className?: string;
  tone: "pink" | "blue";
  flicker?: boolean;
}

// Drawn in a 200×420 box, trunk rooted at the bottom centre, leaning right.
// Mirror with -scale-x-100 for the right-hand side.
function Palm({ className = "", tone, flicker = false }: PalmProps) {
  return (
    <svg
      viewBox="0 0 200 420"
      className={`neon-palm neon-palm-${tone} ${flicker ? "neon-flicker" : ""} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* trunk */}
      <path d="M92 418 C 98 330, 96 230, 128 104" strokeWidth="5" />
      {/* trunk rings */}
      <path
        d="M86 380 l13 -3 M88 335 l13 -3 M91 290 l13 -3 M96 245 l13 -4 M103 202 l13 -4 M111 162 l12 -4 M119 128 l11 -4"
        strokeWidth="2.5"
      />
      {/* fronds */}
      <g strokeWidth="4">
        <path d="M128 100 C 98 74, 58 76, 14 122" />
        <path d="M128 100 C 104 60, 70 46, 34 56" />
        <path d="M128 100 C 122 58, 108 32, 80 14" />
        <path d="M128 100 C 146 54, 166 40, 192 44" />
        <path d="M128 100 C 160 78, 186 92, 196 130" />
        <path d="M128 100 C 150 112, 168 136, 172 172" />
        <path d="M128 100 C 108 116, 86 138, 78 176" />
      </g>
      {/* frond leaflets */}
      <path
        d="M60 80 l-6 14 M44 92 l-6 13 M80 60 l-4 -12 M58 52 l-2 -12 M110 46 l-12 -4 M96 28 l-12 -2 M158 50 l2 -12 M176 44 l4 -11 M170 84 l10 -8 M186 102 l11 -4 M154 128 l12 -4 M164 150 l12 -2 M100 128 l-12 -4 M88 150 l-12 -2"
        strokeWidth="2.5"
      />
      {/* coconuts */}
      <circle cx="120" cy="114" r="5" strokeWidth="3" />
      <circle cx="134" cy="116" r="5" strokeWidth="3" />
    </svg>
  );
}

export function NeonPalms() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden min-[1360px]:block" aria-hidden="true">
      {/* left grove: leans in from the edge */}
      <Palm tone="pink" className="absolute bottom-0 left-[-3.5rem] h-[92%] w-auto" flicker />
      <Palm tone="pink" className="absolute bottom-0 left-[-6rem] h-[58%] w-auto opacity-70 -scale-x-100" />

      {/* right grove */}
      <Palm tone="blue" className="absolute bottom-0 right-[-3.5rem] h-[86%] w-auto -scale-x-100" />
      <Palm tone="blue" className="absolute bottom-0 right-[-6.5rem] h-[52%] w-auto opacity-70" flicker />

      {/* the ground they stand on */}
      <div className="neon-ground absolute inset-x-0 bottom-0 h-px" />
    </div>
  );
}
