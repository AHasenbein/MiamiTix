import { ButtonLink } from "@/components/ui/ButtonLink";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { EventsCarousel } from "@/components/events/EventsCarousel";
import { NextEventCountdown } from "@/components/events/NextEventCountdown";

const featureCards = [
  {
    eyebrow: "01 · Discover",
    title: "Find the night",
    description:
      "Browse upcoming shows, festivals, and warehouse parties curated by the community.",
    accent: "pink"
  },
  {
    eyebrow: "02 · List",
    title: "Drop a ticket in seconds",
    description:
      "Trusted sellers post in under a minute with secure handoff and verified identity.",
    accent: "blue"
  },
  {
    eyebrow: "03 · Trade",
    title: "Trade with confidence",
    description:
      "Direct contact, fair pricing, and an interface designed to move tickets fast.",
    accent: "pink"
  }
] as const;

const howSteps = [
  {
    step: "Step 01",
    title: "Sign in or create an account",
    description: "Verify your email once and you're ready to discover or sell."
  },
  {
    step: "Step 02",
    title: "Find your event",
    description:
      "Filter by city, artist, or venue. Wishlist nights you want to keep an eye on."
  },
  {
    step: "Step 03",
    title: "Buy direct, splice the deal",
    description:
      "Connect with sellers, share contact info, and finalize the transfer without middlemen."
  }
];

const tickerItems = [
  "House",
  "Techno",
  "Indie",
  "Hip Hop",
  "DnB",
  "Festival",
  "Warehouse",
  "Club",
  "Live",
  "Trance",
  "Bass",
  "After Hours"
];

const announcementItems = [
  "Fred again..",
  "Peggy Gou",
  "John Summit",
  "Disclosure",
  "FISHER",
  "Dom Dolla",
  "Chris Lake",
  "Black Coffee",
  "Honey Dijon",
  "Carl Cox",
  "Eric Prydz",
  "Solomun",
  "James Hype",
  "MK",
  "Jamie xx",
  "Gorgon City",
  "CamelPhat",
  "Sonny Fodera",
  "Patrick Topping",
  "Mau P"
];

export default function Home() {
  return (
    <section className="flex flex-1 flex-col">
      <div
        aria-hidden="true"
        className="relative w-full overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(90deg,rgba(255,46,168,0.18),rgba(34,211,255,0.18),rgba(255,46,168,0.18))] animated-gradient"
      >
        <div className="marquee-fast flex w-max gap-10 whitespace-nowrap py-2.5 text-sm font-semibold tracking-wide text-white">
          {[...announcementItems, ...announcementItems].map((item, index) => (
            <span key={`${item}-${index}`} className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
              <span>{item}</span>
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-16 bg-[linear-gradient(90deg,rgba(7,6,15,0.95),transparent)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-16 bg-[linear-gradient(270deg,rgba(7,6,15,0.95),transparent)]" />
      </div>

      <div className="page-shell flex flex-1 flex-col gap-10 py-6 sm:gap-20 sm:py-16">
        <section className="neon-sweep relative grid gap-6 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[linear-gradient(150deg,rgba(24,18,48,0.7),rgba(10,8,22,0.85))] p-5 sm:gap-8 sm:p-12">
          <div className="float-slow pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-[rgba(255,46,168,0.35)] blur-3xl" />
          <div className="float-slow-alt pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[rgba(34,211,255,0.28)] blur-3xl" />
          <div className="relative grid gap-6">
            <div className="fade-in-up delay-1 flex flex-wrap items-center gap-3">
              <span className="brand-pill w-fit">
                <span className="dot" />
                Live · House music marketplace
              </span>
              <NextEventCountdown />
            </div>
            <h1 className="fade-in-up delay-2 brand-heading max-w-3xl text-[2.1rem] font-semibold leading-[1.05] sm:text-6xl">
              <span className="brand-gradient-text animated-gradient">Buy and sell</span>{" "}
              <span className="text-white">event tickets</span>{" "}
              <span className="silver-text">without the friction.</span>
            </h1>
            <p className="fade-in-up delay-3 silver-text max-w-2xl text-sm leading-relaxed sm:text-lg">
              Tix is a zero fees music ticket marketplace for fans. Discover events, join our
              community, and get tickets in minutes — backed by trusted sellers, verified accounts,
              and made by people who actually go to events.
            </p>
            <div className="fade-in-up delay-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ButtonLink href="/events" className="w-full sm:w-auto">
                Browse events
              </ButtonLink>
              <ButtonLink href="/auth/register" variant="secondary" className="w-full sm:w-auto">
                Create an account
              </ButtonLink>
              <ButtonLink href="/listings/new" variant="ghost" className="w-full sm:w-auto">
                <span className="sm:hidden">List tickets</span>
                <span className="hidden sm:inline">Trusted sellers: list tickets</span>
              </ButtonLink>
            </div>
            <dl className="fade-in-up delay-5 mt-2 grid max-w-2xl gap-4 border-t border-[var(--border)] pt-5 sm:mt-4 sm:gap-6 sm:pt-6">
              <div>
                <dt className="text-xs uppercase tracking-[0.16em] text-[var(--neon-pink-soft)] sm:tracking-[0.22em]">
                  Total fees charged
                </dt>
                <dd className="brand-heading mt-1.5 text-2xl font-semibold text-white sm:mt-2">$0.00</dd>
              </div>
            </dl>
          </div>
        </section>

        <section
          aria-hidden="true"
          className="relative overflow-hidden rounded-full border border-[var(--border)] bg-[rgba(232,235,243,0.06)] py-3"
        >
          <div className="marquee-track flex w-max gap-10 whitespace-nowrap px-6 text-xs uppercase tracking-[0.32em] text-[var(--silver)]">
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <span key={`${item}-${index}`} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-pink)] shadow-[0_0_10px_rgba(255,46,168,0.8)]" />
                {item}
              </span>
            ))}
          </div>
        </section>

      <EventsCarousel />

      <section className="grid gap-4 sm:gap-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="brand-pill">
              <span className="dot" />
              How it works
            </span>
            <h2 className="brand-heading mt-3 text-2xl font-semibold sm:text-4xl">
              Three steps to your next night out
            </h2>
          </div>
          <ButtonLink href="/events" variant="ghost">
            Start exploring
          </ButtonLink>
        </header>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {howSteps.map((entry, index) => (
            <SurfaceCard key={entry.step} className="relative overflow-hidden p-5 sm:p-6" elevated={false}>
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,46,168,0.22),transparent_70%)]" />
              <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--neon-blue-soft)]">
                {entry.step}
              </p>
              <h3 className="brand-heading mt-3 text-xl font-semibold text-white">
                {entry.title}
              </h3>
              <p className="muted-text mt-2 text-sm leading-6">{entry.description}</p>
              <p className="brand-heading mt-6 text-5xl font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(232,235,243,0.55)]">
                {String(index + 1).padStart(2, "0")}
              </p>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:gap-6">
        <header>
          <span className="brand-pill">
            <span className="dot" />
            Built for trust
          </span>
          <h2 className="brand-heading mt-3 text-2xl font-semibold sm:text-4xl">
            Why Tix feels alive
          </h2>
        </header>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {featureCards.map((card) => (
            <SurfaceCard
              key={card.title}
              className={`relative overflow-hidden p-5 transition hover:-translate-y-0.5 sm:p-6 ${
                card.accent === "pink"
                  ? "hover:border-[rgba(255,46,168,0.55)] hover:shadow-[0_18px_46px_rgba(255,46,168,0.25)]"
                  : "hover:border-[rgba(34,211,255,0.55)] hover:shadow-[0_18px_46px_rgba(34,211,255,0.25)]"
              }`}
              elevated={false}
            >
              <div
                className={`absolute inset-x-0 top-0 h-px ${
                  card.accent === "pink"
                    ? "bg-[linear-gradient(90deg,transparent,rgba(255,46,168,0.7),transparent)]"
                    : "bg-[linear-gradient(90deg,transparent,rgba(34,211,255,0.7),transparent)]"
                }`}
              />
              <p
                className={`text-[10px] uppercase tracking-[0.22em] ${
                  card.accent === "pink" ? "text-[var(--neon-pink-soft)]" : "text-[var(--neon-blue-soft)]"
                }`}
              >
                {card.eyebrow}
              </p>
              <h3 className="brand-heading mt-3 text-xl font-semibold text-white">{card.title}</h3>
              <p className="muted-text mt-2 text-sm leading-6">{card.description}</p>
            </SurfaceCard>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[linear-gradient(120deg,rgba(255,46,168,0.18),rgba(34,211,255,0.18))] p-6 sm:p-12">
        <div className="pointer-events-none absolute -top-24 right-12 h-64 w-64 rounded-full bg-[rgba(255,46,168,0.35)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-12 h-64 w-64 rounded-full bg-[rgba(34,211,255,0.35)] blur-3xl" />
        <div className="relative grid items-center gap-5 md:grid-cols-[1fr_auto]">
          <div>
            <span className="brand-pill">
              <span className="dot" />
              Ready when you are
            </span>
            <h2 className="brand-heading mt-3 text-2xl font-semibold text-white sm:text-4xl">
              Plug in. Tune in. <span className="brand-gradient-text">Vibe out.</span>
            </h2>
            <p className="silver-text mt-2 max-w-xl text-sm sm:text-base">
              Whether you&apos;re chasing a sold-out show or moving a spare ticket fast, Tix keeps
              it sleek, secure, and electric.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="/events">Browse events</ButtonLink>
            <ButtonLink href="/auth/register" variant="secondary">
              Join free
            </ButtonLink>
          </div>
        </div>
      </section>
      </div>
    </section>
  );
}
