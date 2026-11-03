import { ButtonLink } from "@/components/ui/ButtonLink";
import { EventsCarousel } from "@/components/events/EventsCarousel";
import { EventOfTheMonth } from "@/components/home/EventOfTheMonth";
import { EventTicker } from "@/components/home/EventTicker";
import { HeroHeadline } from "@/components/home/HeroHeadline";
import { HeroSearch } from "@/components/home/HeroSearch";
import { NextEventSpotlight } from "@/components/home/NextEventSpotlight";

const steps = [
  {
    title: "Find the event",
    description:
      "Search by artist, venue, or event and save the nights you're watching to your wishlist."
  },
  {
    title: "Request the tickets",
    description:
      "Pick a listing and leave your number. The seller gets your request right away."
  },
  {
    title: "Settle it with the seller",
    description:
      "You agree on the handoff directly. Tix doesn't take a cut from either side."
  }
];

const facts = [
  { label: "Buyer fee", value: "$0" },
  { label: "Seller fee", value: "$0" },
  { label: "Sellers", value: "Verified" }
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <EventTicker />

      <div className="page-shell flex flex-1 flex-col gap-16 py-12 sm:gap-24 sm:py-20">
        <section className="grid justify-items-center gap-8 text-center">
          <HeroHeadline />
          <p className="max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            Fan-to-fan tickets for Miami club nights, festivals, and concerts. Buyers and sellers
            deal directly, and nobody pays a platform fee.
          </p>
          <HeroSearch />
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/events" variant="secondary" className="h-9 px-4 text-[13px]">
              All events
            </ButtonLink>
            <ButtonLink href="/listings/new" variant="secondary" className="h-9 px-4 text-[13px]">
              Sell tickets
            </ButtonLink>
          </div>
        </section>

        <NextEventSpotlight />

        <EventsCarousel title="This week in Miami" />

        <EventOfTheMonth />

        <section className="grid gap-8 border-t border-[var(--border)] pt-12 md:grid-cols-[16rem_minmax(0,1fr)]">
          <header className="grid content-start gap-5">
            <h2 className="brand-heading text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
              No middleman.
            </h2>
            <dl className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)]">
              {facts.map((fact) => (
                <div key={fact.label} className="flex items-baseline justify-between bg-[var(--background)] px-4 py-3">
                  <dt className="text-xs text-[var(--subtle)]">{fact.label}</dt>
                  <dd className="tabular font-semibold text-[var(--foreground)]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </header>
          <ol className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="bg-[var(--background)] p-5 sm:p-6">
                <span className={`tabular text-sm ${index === 1 ? "text-[var(--blue-soft)]" : "text-[var(--pink-soft)]"}`}>
                  0{index + 1}
                </span>
                <h3 className="mt-3 text-base font-semibold text-[var(--foreground)]">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 className="brand-heading text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
              Got a spare ticket?
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Verified sellers can list in about a minute.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/listings/new">List a ticket</ButtonLink>
            <ButtonLink href="/auth/register" variant="secondary">
              Create an account
            </ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}
