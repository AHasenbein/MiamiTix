import type { Metadata } from "next";
import { EventsBrowse } from "@/components/events/EventsBrowse";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Events",
  description: "Browse events that currently have tickets listed for sale."
};

export default function EventsPage() {
  return (
    <section className="page-shell flex flex-1 flex-col gap-6 py-6 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="muted-text text-xs uppercase tracking-[0.18em]">marketplace</p>
          <h1 className="brand-heading mt-2 text-2xl font-semibold sm:text-3xl">Listed events</h1>
          <p className="muted-text mt-2 text-sm">
            Browse only events with active listings.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <ButtonLink href="/listings/new" className="w-full sm:w-auto">
            <span className="sm:hidden">List tickets</span>
            <span className="hidden sm:inline">Trusted sellers: list tickets</span>
          </ButtonLink>
          <ButtonLink href="/listings/mine" variant="secondary" className="w-full sm:w-auto">
            My listings
          </ButtonLink>
        </div>
      </div>
      <EventsBrowse />
    </section>
  );
}
