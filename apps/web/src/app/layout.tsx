import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
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
  themeColor: "#07060f",
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
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
