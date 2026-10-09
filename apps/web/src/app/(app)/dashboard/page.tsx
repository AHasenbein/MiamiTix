import type { Metadata } from "next";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Quick actions for your ticket marketplace activity."
};

export default function DashboardPage() {
  return (
    <section className="page-shell flex flex-1 items-start justify-center py-6 sm:py-14">
      <DashboardPanel />
    </section>
  );
}
