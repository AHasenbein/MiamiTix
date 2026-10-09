import { ImageResponse } from "next/og";
import { BRAND, LogoMark } from "@/lib/brand/logo-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS masks its own rounded corners, so fill the square with the brand background.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.background
        }}
      >
        <LogoMark size={140} />
      </div>
    ),
    size
  );
}
