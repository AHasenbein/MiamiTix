import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailClient } from "@/components/auth/VerifyEmailClient";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Confirm your email to complete account setup."
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="muted-text text-sm">Loading verification...</p>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
