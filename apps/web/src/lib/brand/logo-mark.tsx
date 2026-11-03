// Shared "TX" badge used by the generated icon / Open Graph images.
// Mirrors the header mark in AppHeader, rendered with inline styles for next/og.

export const BRAND = {
  name: "Tix",
  tagline: "Miami event tickets, resold without fees.",
  description: "Zero-fee music ticket marketplace. Discover events and trade tickets with trusted sellers.",
  background: "#09090b",
  foreground: "#fafafa",
  muted: "#a1a1aa",
  border: "#27272a"
} as const;

export function LogoMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: size * 0.2,
        background: BRAND.foreground,
        color: BRAND.background,
        fontSize: size * 0.46,
        fontWeight: 800,
        letterSpacing: size * -0.02
      }}
    >
      tx
    </div>
  );
}
