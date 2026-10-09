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
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: BRAND.background,
          backgroundImage: `radial-gradient(circle at 10% 0%, rgba(255,46,168,0.45), transparent 50%), radial-gradient(circle at 95% 100%, rgba(34,211,255,0.4), transparent 50%)`,
          color: "#ffffff"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <LogoMark size={200} />
          <div style={{ display: "flex", fontSize: 168, fontWeight: 700, letterSpacing: -4 }}>
            {BRAND.name}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 44, color: "rgba(241,244,251,0.88)" }}>
          {BRAND.tagline}
        </div>
        <div
          style={{
            display: "flex",
            width: 520,
            height: 6,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${BRAND.pink}, ${BRAND.blue})`
          }}
        />
      </div>
    ),
    size
  );
}
