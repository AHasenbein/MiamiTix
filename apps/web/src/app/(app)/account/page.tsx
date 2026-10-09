import type { Metadata } from "next";
import { AccountPanel } from "@/components/auth/AccountPanel";

export const metadata: Metadata = {
  title: "Account",
  description: "Review your profile and authentication status."
};

export default function AccountPage() {
  return (
    <section className="page-shell flex flex-1 items-start justify-center py-6 sm:py-14">
      <AccountPanel />
    </section>
  );
}
