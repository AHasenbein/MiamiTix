import Link from "next/link";
import type { Listing } from "@/lib/api/listings";

interface ListingCardProps {
  listing: Listing;
  /** Thumbnail shown on the left of the row (the event image). */
  imageUrl?: string;
}

const seatTypeLabel: Record<Listing["seatType"], string> = {
  GA: "General admission",
  VIP: "VIP",
  OTHER: "Other"
};

/** One row of the event page's ticket list: thumbnail, ticket name and details, price pill. */
export function ListingCard({ listing, imageUrl }: ListingCardProps) {
  const amount = (listing.priceCents / 100).toFixed(2).replace(/\.00$/, "");
  const ticketCount = `${listing.quantity} Ticket${listing.quantity === 1 ? "" : "s"}`;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex items-center gap-4 border-b border-[var(--border)] px-1 py-4 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-elevated)] sm:h-[4.5rem] sm:w-[4.5rem]">
        {imageUrl ? <img alt="" className="h-full w-full object-cover" src={imageUrl} /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-2 text-base font-medium text-[var(--foreground)] sm:text-lg">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-[2px] bg-[var(--success)]" />
          <span className="line-clamp-1">{listing.title}</span>
        </h3>
        <p className="mt-0.5 text-sm text-[var(--muted)]">{ticketCount}</p>
        {listing.sellerName ? (
          <p className="flex items-center gap-1 text-sm text-[var(--muted)]">
            <span className="line-clamp-1">{listing.sellerName}</span>
            <VerifiedBadge />
          </p>
        ) : (
          <p className="text-sm text-[var(--muted)]">{seatTypeLabel[listing.seatType]}</p>
        )}
      </div>
      <span className="shrink-0 rounded-full tabular-nums bg-white/[0.08] px-5 py-3 text-base font-medium text-[var(--foreground)] transition-colors group-hover:bg-white/[0.14]">
        ${amount} <span className="text-sm text-[var(--muted)]">ea</span>
      </span>
    </Link>
  );
}

/** Every seller on Tix is an approved trusted seller, so each named row gets the check. */
function VerifiedBadge() {
  return (
    <svg
      role="img"
      aria-label="Verified seller"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 fill-[var(--brand-blue)]"
    >
      <title>Verified seller</title>
      <path d="M12 1.5l2.6 1.9 3.2-.1 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.1L12 22.5l-2.6-1.9-3.2.1-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.1L12 1.5z" />
      <path d="M10.4 15.6l-3.3-3.3 1.4-1.4 1.9 1.9 5-5 1.4 1.4-6.4 6.4z" fill="#fff" />
    </svg>
  );
}
