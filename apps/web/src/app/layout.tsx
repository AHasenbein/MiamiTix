import type { Metadata } from "next";
import { Yellowtail } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// Brand fonts live in /brand/fonts at the repo root (licences alongside).
// Standing Room Only NF: headlines and logotype. Served unmodified, as its licence requires.
const display = localFont({
  src: "../../../../brand/fonts/standing-room-only/StandingRoomOnlyNF.ttf",
  variable: "--font-display",
  weight: "400",
  display: "swap",
});

// Jost (SIL OFL): body text.
const body = localFont({
  src: "../../../../brand/fonts/jost/Jost-VariableFont_wght.ttf",
  variable: "--font-body",
  weight: "100 900",
  display: "swap",
});

// Neon-sign script, used for a single hero phrase only.
const yellowtail = Yellowtail({
  variable: "--font-neon",
  subsets: ["latin"],
  weight: "400",
});

// Absolute base for og:image and other metadata URLs, required for link previews
// (Instagram, iMessage, WhatsApp...). SITE_URL is inlined by next.config.ts from
// NEXT_PUBLIC_SITE_URL or Netlify's URL.
const siteUrl = process.env.SITE_URL || "http://localhost:3000";

const siteDescription =
  "Zero-fee music ticket marketplace. Discover events and buy or sell tickets with trusted sellers.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tix — Buy and sell event tickets",
    template: "%s | Tix",
  },
  description: siteDescription,
  applicationName: "Tix",
  openGraph: {
    type: "website",
    siteName: "Tix",
    title: "Tix — Buy and sell event tickets",
    description: siteDescription,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tix — Buy and sell event tickets",
    description: siteDescription,
  },
};

export const viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${yellowtail.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
