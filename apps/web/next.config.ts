import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

// Public site URL for absolute link-preview URLs (og:image). Inlined at build time so
// server-rendered routes don't depend on Netlify's URL being present at function runtime.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL;

const nextConfig: NextConfig = {
  ...(siteUrl ? { env: { SITE_URL: siteUrl } } : {}),
  turbopack: {
    root: path.resolve(currentDir, "../../")
  }
};

export default nextConfig;
