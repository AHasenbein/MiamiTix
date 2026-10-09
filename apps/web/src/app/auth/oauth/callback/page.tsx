import type { Metadata } from "next";
import { Suspense } from "react";
import { OAuthCallbackClient } from "@/components/auth/OAuthCallbackClient";

export const metadata: Metadata = {
  title: "OAuth Callback",
  description: "Finalizing sign in."
};

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<p className="muted-text text-sm">Finishing sign in...</p>}>
      <OAuthCallbackClient />
    </Suspense>
  );
}
