// Shared "TX" badge used by the generated icon / Open Graph images.
// Mirrors the header badge in AppHeader, rendered with inline styles for next/og.

export const BRAND = {
  name: "Tix",
  tagline: "Buy and sell event tickets without the friction.",
  description: "Zero-fee music ticket marketplace. Discover events and trade tickets with trusted sellers.",
  background: "#07060f",
  pink: "#ff2ea8",
  blue: "#22d3ff"
} as const;

export function LogoMark({ size }: { size: number }) {
  const border = Math.max(2, Math.round(size * 0.07));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        padding: border,
        borderRadius: size * 0.22,
        background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.blue})`
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: size * 0.17,
          background: BRAND.background,
          color: "#ffffff",
          fontSize: size * 0.42,
          fontWeight: 700,
          letterSpacing: size * -0.01
        }}
      >
        TX
      </div>
    </div>
  );
}
