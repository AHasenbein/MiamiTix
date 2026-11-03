import Link from "next/link";
import type { Listing } from "@/lib/api/listings";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const amount = (listing.priceCents / 100).toFixed(2);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <div className="min-w-0">
        <h3 className="line-clamp-1 text-sm font-semibold text-[var(--foreground)]">{listing.title}</h3>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {listing.seatType} · {listing.quantity} left
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="tabular text-base font-semibold text-[var(--foreground)]">${amount}</p>
        <p className="text-[11px] text-[var(--subtle)]">per ticket</p>
      </div>
    </Link>
  );
}
