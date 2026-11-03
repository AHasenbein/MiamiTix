import { ButtonLink } from "@/components/ui/ButtonLink";
import { EventsCarousel } from "@/components/events/EventsCarousel";
import { NextEventCountdown } from "@/components/events/NextEventCountdown";

const steps = [
  {
    title: "Find the event",
    description:
      "See what's coming up in Miami and save the nights you're watching to your wishlist."
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
    <div className="page-shell flex flex-1 flex-col py-8 sm:py-16">
      <section className="grid gap-10 pb-12 sm:pb-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-6">
          <NextEventCountdown />
          <h1 className="brand-heading max-w-3xl text-[2.5rem] font-extrabold leading-[1.02] text-[var(--foreground)] sm:text-7xl">
            Miami event tickets, resold without fees.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            Tix is a fan-to-fan marketplace for club nights, festivals, and concerts. Buyers
            and sellers deal directly, and nobody pays a platform fee.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/events" className="w-full sm:w-auto">
              Browse events
            </ButtonLink>
            <ButtonLink href="/listings/new" variant="secondary" className="w-full sm:w-auto">
              Sell tickets
            </ButtonLink>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] lg:w-80 lg:grid-cols-1">
          {facts.map((fact) => (
            <div key={fact.label} className="bg-[var(--background)] px-4 py-3 lg:flex lg:items-baseline lg:justify-between">
              <dt className="text-xs text-[var(--subtle)]">{fact.label}</dt>
              <dd className="tabular mt-1 text-lg font-semibold text-[var(--foreground)] lg:mt-0">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="border-t border-[var(--border)] pt-10 sm:pt-14">
        <EventsCarousel title="Upcoming in Miami" subtitle="" autoAdvanceMs={0} />
      </div>

      <section className="mt-14 grid gap-8 border-t border-[var(--border)] pt-10 sm:mt-20 sm:pt-14 md:grid-cols-[14rem_minmax(0,1fr)]">
        <header>
          <p className="eyebrow">How it works</p>
          <h2 className="brand-heading mt-2 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            No middleman.
          </h2>
        </header>
        <ol className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="bg-[var(--background)] p-5 sm:p-6">
              <span className="tabular text-sm text-[var(--accent)]">{index + 1}.</span>
              <h3 className="mt-2 text-base font-semibold text-[var(--foreground)]">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 flex flex-col gap-4 border-t border-[var(--border)] pt-10 sm:mt-20 sm:flex-row sm:items-center sm:justify-between sm:pt-14">
        <div>
          <h2 className="brand-heading text-xl font-bold text-[var(--foreground)] sm:text-2xl">
            Got a spare ticket?
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Verified sellers can list in about a minute.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/listings/new" variant="secondary">
            List a ticket
          </ButtonLink>
          <ButtonLink href="/auth/register" variant="ghost">
            Create an account
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
