import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Log In or Sign Up",
  description: "Log in or create your Miami Tix account to buy and sell event tickets."
};

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="muted-text text-sm">Loading...</p>}>
      <AuthCard />
    </Suspense>
  );
}
