import type { Metadata } from "next";
import { MyListings } from "@/components/listings/MyListings";

export const metadata: Metadata = {
  title: "My Listings",
  description: "Manage active and sold ticket listings."
};

export default function MyListingsPage() {
  return (
    <section className="page-shell flex flex-1 flex-col py-6 sm:py-12">
      <MyListings />
    </section>
  );
}
