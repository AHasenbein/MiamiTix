import type { Metadata } from "next";
import { CreateListingForm } from "@/components/listings/CreateListingForm";

export const metadata: Metadata = {
  title: "Create Listing",
  description: "Publish a ticket listing for an upcoming event."
};

export default function NewListingPage() {
  return (
    <section className="page-shell flex flex-1 flex-col py-4 sm:py-12">
      <CreateListingForm />
    </section>
  );
}
