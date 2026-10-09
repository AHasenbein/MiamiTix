import type { Metadata } from "next";
import { ListingDetail } from "@/components/listings/ListingDetail";

interface ListingDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Listing Details",
  description: "Review listing details and send your ticket request to the seller."
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;

  return (
    <section className="page-shell flex flex-1 flex-col py-6 sm:py-12">
      <ListingDetail listingId={id} />
    </section>
  );
}
