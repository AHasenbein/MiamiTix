import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your Tix account for event ticket trading."
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="muted-text text-sm">Loading registration...</p>}>
      <AuthCard mode="register" />
    </Suspense>
  );
}
