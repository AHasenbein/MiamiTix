import { ImageResponse } from "next/og";
import { BRAND, LogoMark } from "@/lib/brand/logo-mark";

export const alt = "Tix — buy and sell event tickets";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 88,
          background: BRAND.background,
          color: BRAND.foreground
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <LogoMark size={96} />
          <div style={{ display: "flex", fontSize: 72, fontWeight: 800, letterSpacing: -2 }}>
            {BRAND.name}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 800,
            letterSpacing: -2.5,
            lineHeight: 1.05,
            maxWidth: 940
          }}
        >
          {BRAND.tagline}
        </div>
        <div
          style={{
            display: "flex",
            borderTop: `2px solid ${BRAND.border}`,
            paddingTop: 28,
            fontSize: 30,
            color: BRAND.muted
          }}
        >
          $0 platform fees · Verified sellers
        </div>
      </div>
    ),
    size
  );
}
