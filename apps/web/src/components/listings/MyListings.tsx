"use client";

import { useEffect, useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import type { Listing } from "@/lib/api/listings";
import { listMyListings } from "@/lib/api/listings";
import { readAuthToken } from "@/lib/auth/token-storage";
import { hasEventStarted } from "@/lib/datetime";
import { Alert } from "../ui/Alert";
import { ButtonLink } from "../ui/ButtonLink";
import { SurfaceCard } from "../ui/SurfaceCard";

export function MyListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      const token = readAuthToken();
      if (!token) {
        if (!cancelled) {
          setErrorMessage("Log in to view your listings.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await listMyListings(token);
        if (!cancelled) {
          setListings(response);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiClientError ? error.message : "Could not load your listings."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadListings();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <p className="muted-text text-sm" role="status" aria-live="polite">
        Loading your listings...
      </p>
    );
  }

  if (errorMessage) {
    return <Alert tone="error" announce="assertive">{errorMessage}</Alert>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="brand-heading text-2xl font-semibold sm:text-3xl">My listings</h1>
        <ButtonLink href="/listings/new">Create listing</ButtonLink>
      </div>
      {listings.length ? (
        listings.map((listing) => (
          <SurfaceCard className="grid gap-2 p-4" elevated={false} key={listing.id}>
            <ButtonLink
              href={`/listings/${listing.id}`}
              variant="ghost"
              className="h-auto justify-start px-0 py-0 text-left text-base"
            >
              {listing.title}
            </ButtonLink>
            <p className="muted-text text-sm">
              ${(listing.priceCents / 100).toFixed(2)} x {listing.quantity} remaining
            </p>
            <p className="muted-text text-sm">Seat type: {listing.seatType}</p>
            <p className="muted-text text-sm">
              {listing.eventTitle} - {listing.eventCity} -{" "}
              {new Date(listing.eventStartAt).toLocaleDateString()}
            </p>
            {hasEventStarted(listing.eventStartAt) ? (
              <p className="muted-text text-sm">Event ended</p>
            ) : (
              <p className={`text-sm ${listing.soldOut ? "text-danger" : "text-success"}`}>
                {listing.soldOut ? "Sold out" : "Active"}
              </p>
            )}
          </SurfaceCard>
        ))
      ) : (
        <SurfaceCard className="p-4" elevated={false}>
          <p className="muted-text text-sm">No listings yet.</p>
        </SurfaceCard>
      )}
    </div>
  );
}
