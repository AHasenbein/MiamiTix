import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EventsCarousel } from "@/components/events/EventsCarousel";
import { EventOfTheMonth } from "@/components/home/EventOfTheMonth";
import { EventTicker } from "@/components/home/EventTicker";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { NextEventTicket } from "@/components/home/NextEventTicket";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <EventTicker />

      <div className="relative isolate">
        {/* Neon palms are switched off for now. To bring them back: <NeonPalms /> from
            @/components/home/NeonPalms (or <Palm tone="blue" /> inside the wordmark). */}
        <section className="page-shell grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-16 lg:pb-28 lg:pt-12">
          {/* On desktop this column matches the featured ticket's height, items spread evenly. */}
          <div className="flex flex-col gap-7 lg:self-stretch lg:justify-between lg:gap-0">
            <h1 className="display-heading text-[clamp(1.85rem,7.4vw,3.6rem)] font-extrabold uppercase leading-[1.02] text-[var(--foreground)]">
              {/* Signature wordmark (brand/source/wordmark-signature.png, background made transparent). */}
              <span className="relative block w-full max-w-[28rem] sm:max-w-[22rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/wordmark-signature.png"
                  alt="Miami Tix"
                  width={1000}
                  height={499}
                  className="block h-auto w-full"
                />
              </span>
              <span className="mt-4 block">Zero fees</span>
            </h1>
            {/* The palms are a background layer (-z-10); this content sits on top of them. */}
            <div className="contents">
              <div className="grid max-w-lg grid-cols-2 gap-3">
                <ButtonLink
                  href="/events"
                  className="h-14 !bg-[var(--brand-blue)] text-base font-bold uppercase tracking-wide !text-[#111111] hover:brightness-110 sm:h-16 sm:text-lg"
                >
                  Get tickets
                </ButtonLink>
                <ButtonLink
                  href="/listings/new"
                  className="h-14 !bg-[var(--brand-pink)] text-base font-bold uppercase tracking-wide !text-[#111111] hover:brightness-110 sm:h-16 sm:text-lg"
                >
                  Sell tickets
                </ButtonLink>
              </div>
              <SearchAutocomplete size="lg" className="max-w-lg" />
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <Link href="/events" className="text-[var(--silver)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-white">
                  Browse all events
                </Link>
                <Link href="/listings/new" className="text-[var(--silver)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-white">
                  Sell your tickets
                </Link>
              </div>
            </div>
          </div>
          <NextEventTicket />
        </section>
      </div>

      <div className="page-shell flex flex-1 flex-col gap-16 py-12 sm:gap-24 sm:py-20">

        <EventsCarousel title="Coming up in Miami" />

        <EventOfTheMonth />

        {/* Verified seller application form, switched off for now:
            <SellerApplicationForm /> from @/components/home/SellerApplicationForm */}

        <section className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 className="display-heading text-xl font-extrabold uppercase text-[var(--foreground)] sm:text-2xl">
              Got a spare ticket?
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Verified sellers can list in about a minute.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/listings/new">List a ticket</ButtonLink>
            <ButtonLink href="/auth/login?mode=signup" variant="secondary">
              Create an account
            </ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}
