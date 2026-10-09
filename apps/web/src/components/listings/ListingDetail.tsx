"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getCurrentUser } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import { getEvent, uploadEventImage } from "@/lib/api/events";
import { deleteListing, getListing, purchaseListing, updateListing } from "@/lib/api/listings";
import type { Listing } from "@/lib/api/listings";
import { readAuthToken } from "@/lib/auth/token-storage";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { ButtonLink } from "../ui/ButtonLink";
import { EventImagePicker } from "../ui/EventImagePicker";
import { Input } from "../ui/Input";
import { SurfaceCard } from "../ui/SurfaceCard";

// Mirrors the API's per-request cap (purchaseSchema in listing-routes.ts).
const MAX_TICKETS_PER_REQUEST = 10;

interface ListingDetailProps {
  listingId: string;
}

export function ListingDetail({ listingId }: ListingDetailProps) {
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [eventImageUrl, setEventImageUrl] = useState("");
  const [eventImageDataToUpload, setEventImageDataToUpload] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTopTrustedSeller, setIsTopTrustedSeller] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [phone, setPhone] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingListing, setIsEditingListing] = useState(false);
  const [isDeletingListing, setIsDeletingListing] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadListing() {
      try {
        const response = await getListing(listingId);
        if (!cancelled) {
          setListing(response);
          setEditTitle(response.title);
          setEditPrice((response.priceCents / 100).toFixed(2));
          setEditQuantity(String(response.quantity));
        }
        const eventResponse = await getEvent(response.eventId);
        if (!cancelled) {
          setEventImageUrl(eventResponse.imageUrl ?? "");
          setEventImageDataToUpload("");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiClientError ? error.message : "Unable to load listing."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    async function loadCurrentUser() {
      const token = readAuthToken();
      if (!token) {
        return;
      }
      try {
        const response = await getCurrentUser(token);
        if (!cancelled) {
          setCurrentUserId(response.user.id);
          setIsTopTrustedSeller(response.user.isTopTrustedSeller);
        }
      } catch {
        // Ignore user lookup errors and keep page usable.
      }
    }

    void loadListing();
    void loadCurrentUser();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  async function handlePurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = readAuthToken();
    if (!token) {
      router.push(`/auth/login?returnTo=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }

    if (!listing) {
      return;
    }

    const parsedQuantity = Number(quantity);
    const maxRequestable = Math.min(MAX_TICKETS_PER_REQUEST, listing.quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMessage("Enter a valid ticket quantity.");
      return;
    }
    if (parsedQuantity > maxRequestable) {
      setErrorMessage(`You can request up to ${maxRequestable} ticket${maxRequestable === 1 ? "" : "s"}.`);
      return;
    }
    if (phone.trim().length < 7) {
      setErrorMessage("Enter a valid phone number so the seller can contact you.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setMessage("");
    try {
      const result = await purchaseListing(listing.id, parsedQuantity, phone.trim(), token);
      setMessage(result.message);
    } catch (error) {
      setErrorMessage(error instanceof ApiClientError ? error.message : "Request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = readAuthToken();
    if (!token || !listing) {
      router.push(`/auth/login?returnTo=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }

    const parsedPrice = Math.round(Number(editPrice) * 100);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 100) {
      setErrorMessage("Price must be at least $1.00.");
      return;
    }
    const parsedQuantity = Number(editQuantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 20) {
      setErrorMessage("Quantity must be between 1 and 20.");
      return;
    }

    setIsEditingListing(true);
    setIsUploadingImage(Boolean(eventImageDataToUpload));
    setErrorMessage("");
    setMessage("");
    try {
      // An empty string tells the API to clear the image (undefined would leave it unchanged).
      let uploadedEventImageUrl = eventImageUrl;
      if (eventImageDataToUpload) {
        uploadedEventImageUrl = await uploadEventImage(eventImageDataToUpload, token);
      }
      const updated = await updateListing(
        listing.id,
        {
          title: editTitle.trim(),
          priceCents: parsedPrice,
          quantity: parsedQuantity,
          eventImageUrl: uploadedEventImageUrl
        },
        token
      );
      setListing(updated);
      setEditTitle(updated.title);
      setEditPrice((updated.priceCents / 100).toFixed(2));
      setEditQuantity(String(updated.quantity));
      setEventImageUrl(uploadedEventImageUrl);
      setEventImageDataToUpload("");
      setMessage("Listing updated.");
    } catch (error) {
      setErrorMessage(error instanceof ApiClientError ? error.message : "Could not update listing.");
    } finally {
      setIsEditingListing(false);
      setIsUploadingImage(false);
    }
  }

  function applyCroppedImage(dataUrl: string) {
    setImageError("");
    setEventImageUrl(dataUrl);
    setEventImageDataToUpload(dataUrl);
  }

  function clearEventImage() {
    setImageError("");
    setEventImageUrl("");
    setEventImageDataToUpload("");
  }

  async function handleDeleteListing() {
    const token = readAuthToken();
    if (!token || !listing) {
      router.push(`/auth/login?returnTo=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }
    if (!window.confirm("Delete this listing? This cannot be undone.")) {
      return;
    }

    setIsDeletingListing(true);
    setErrorMessage("");
    setMessage("");
    try {
      await deleteListing(listing.id, token);
      router.push("/listings/mine");
    } catch (error) {
      setErrorMessage(error instanceof ApiClientError ? error.message : "Could not delete listing.");
      setIsDeletingListing(false);
    }
  }

  if (isLoading) {
    return (
      <p className="muted-text text-sm" role="status" aria-live="polite">
        Loading listing...
      </p>
    );
  }

  if (errorMessage && !listing) {
    return <Alert tone="error" announce="assertive">{errorMessage}</Alert>;
  }

  if (!listing) {
    return <p className="muted-text text-sm">Listing not found.</p>;
  }

  const canEditListing = Boolean(currentUserId) && (currentUserId === listing.sellerId || isTopTrustedSeller);
  const canDeleteListing = currentUserId === listing.sellerId;
  const isSoldOut = listing.soldOut || listing.quantity <= 0;

  return (
    <SurfaceCard className="grid max-w-xl gap-4 p-5 sm:p-8">
      <nav className="flex items-center gap-2 text-sm">
        {canDeleteListing ? (
          <Link href="/listings/mine" className="muted-text underline underline-offset-4">
            My listings
          </Link>
        ) : (
          <Link
            href={`/events/${listing.eventId}`}
            className="muted-text underline underline-offset-4"
          >
            Back to event
          </Link>
        )}
        <span className="muted-text">/</span>
        <span className="muted-text">Listing details</span>
      </nav>
      <h1 className="brand-heading text-2xl font-semibold sm:text-3xl">{listing.title}</h1>
      <p className="muted-text text-sm">
        For event:{" "}
        <Link
          href={`/events/${listing.eventId}`}
          className="text-[var(--foreground)] underline underline-offset-4"
        >
          {listing.eventTitle}
        </Link>{" "}
        in {listing.eventCity}
      </p>
      <p className="muted-text text-sm">
        Event time: {new Date(listing.eventStartAt).toLocaleString()}
      </p>
      <p className="text-sm text-white/90">
        ${(listing.priceCents / 100).toFixed(2)} per ticket (reference price)
      </p>
      <p className="muted-text text-sm">Seat type: {listing.seatType}</p>
      <p className="muted-text text-sm">
        {listing.quantity} ticket{listing.quantity === 1 ? "" : "s"} available
      </p>
      {listing.notes ? <p className="muted-text text-sm">{listing.notes}</p> : null}

      <form className="grid gap-3" onSubmit={handlePurchase}>
        <Input
          label="Tickets requested"
          max={Math.max(1, Math.min(MAX_TICKETS_PER_REQUEST, listing.quantity))}
          min={1}
          onChange={(event) => setQuantity(event.target.value)}
          required
          type="number"
          value={quantity}
        />
        <Input
          label="Your phone number"
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+1 555 555 5555"
          required
          type="tel"
          value={phone}
        />
        <Button disabled={isSubmitting || isSoldOut} type="submit">
          {isSoldOut ? "Sold out" : isSubmitting ? "Sending request..." : "Request tickets"}
        </Button>
      </form>
      {canEditListing ? (
        <div className="grid gap-3">
          <Button
            onClick={() => setIsEditFormOpen((current) => !current)}
            type="button"
            variant="secondary"
          >
            {isEditFormOpen ? "Close edit listing" : "Edit listing"}
          </Button>
          {isEditFormOpen ? (
            <form
              className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-4"
              onSubmit={handleEditListing}
            >
              <h2 className="brand-heading text-base font-semibold">Edit listing</h2>
              <Input
                label="Listing title"
                onChange={(event) => setEditTitle(event.target.value)}
                value={editTitle}
              />
              <Input
                label="Price per ticket (USD)"
                min="1"
                onChange={(event) => setEditPrice(event.target.value)}
                step="0.01"
                type="number"
                value={editPrice}
              />
              <Input
                label="Quantity available"
                max={20}
                min={1}
                onChange={(event) => setEditQuantity(event.target.value)}
                type="number"
                value={editQuantity}
              />
              <EventImagePicker
                variant="field"
                label="Event image"
                helperText="Choose a photo, then crop what shows on cards"
                valueUrl={eventImageUrl}
                onChange={applyCroppedImage}
                onClear={clearEventImage}
                errorMessage={imageError || undefined}
              />
              <Button disabled={isEditingListing} type="submit" variant="secondary">
                {isEditingListing
                  ? isUploadingImage
                    ? "Uploading image..."
                    : "Saving..."
                  : "Save listing changes"}
              </Button>
              {canDeleteListing ? (
                <Button
                  disabled={isDeletingListing}
                  onClick={handleDeleteListing}
                  type="button"
                  variant="danger"
                >
                  {isDeletingListing ? "Deleting..." : "Delete listing"}
                </Button>
              ) : null}
            </form>
          ) : null}
          {canDeleteListing && !isEditFormOpen ? (
            <Button
              disabled={isDeletingListing}
              onClick={handleDeleteListing}
              type="button"
              variant="danger"
            >
              {isDeletingListing ? "Deleting..." : "Delete listing"}
            </Button>
          ) : null}
        </div>
      ) : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      {message ? (
        canDeleteListing ? (
          <ButtonLink href="/listings/mine" variant="secondary" className="w-full sm:w-auto">
            Return to my listings
          </ButtonLink>
        ) : (
          <ButtonLink
            href={`/events/${listing.eventId}`}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            Back to event
          </ButtonLink>
        )
      ) : null}
      {errorMessage ? <Alert tone="error" announce="assertive">{errorMessage}</Alert> : null}
    </SurfaceCard>
  );
}
