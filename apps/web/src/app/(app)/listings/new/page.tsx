import type { Metadata } from "next";
import { CreateListingForm } from "@/components/listings/CreateListingForm";

export const metadata: Metadata = {
  title: "Create Listing",
  description: "Publish a ticket listing for an upcoming event."
};

interface NewListingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewListingPage({ searchParams }: NewListingPageProps) {
  const { eventId } = await searchParams;

  return (
    <section className="page-shell flex flex-1 flex-col py-4 sm:py-12">
      <CreateListingForm initialEventId={typeof eventId === "string" ? eventId : undefined} />
    </section>
  );
}
