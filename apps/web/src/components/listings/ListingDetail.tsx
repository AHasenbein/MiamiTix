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
import { readAuthToken, readSavedBuyerPhone, saveBuyerPhone } from "@/lib/auth/token-storage";
import { formatEventDateTime, hasEventStarted } from "@/lib/datetime";
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
  // Only send the shared event image when the user actually changed it, so a failed event
  // lookup (empty state) can't wipe the image on save.
  const [isEventImageDirty, setIsEventImageDirty] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTopTrustedSeller, setIsTopTrustedSeller] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [phone, setPhone] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editSeatType, setEditSeatType] = useState<Listing["seatType"]>("GA");
  const [editNotes, setEditNotes] = useState("");
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [isTogglingSoldOut, setIsTogglingSoldOut] = useState(false);
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
          setEditSeatType(response.seatType);
          setEditNotes(response.notes ?? "");
        }
        // The image is decorative here; a failed event lookup shouldn't show an error banner.
        const eventResponse = await getEvent(response.eventId).catch(() => null);
        if (!cancelled && eventResponse) {
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
          setPhone((current) => current || readSavedBuyerPhone());
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
    if (phone.replace(/\D/g, "").length < 7) {
      setErrorMessage("Enter a valid phone number so the seller can contact you.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setMessage("");
    try {
      const result = await purchaseListing(listing.id, parsedQuantity, phone.trim(), token);
      saveBuyerPhone(phone.trim());
      setHasSentRequest(true);
      setMessage(result.message);
    } catch (error) {
      if (error instanceof ApiClientError && error.statusCode === 401) {
        router.push(`/auth/login?returnTo=${encodeURIComponent(`/listings/${listingId}`)}`);
        return;
      }
      if (error instanceof ApiClientError && error.statusCode === 409) {
        setHasSentRequest(true);
      }
      setErrorMessage(
        error instanceof ApiClientError
          ? error.issues?.[0]?.message ?? error.message
          : "Request failed."
      );
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
      if (isEventImageDirty && eventImageDataToUpload) {
        uploadedEventImageUrl = await uploadEventImage(eventImageDataToUpload, token);
      }
      const updated = await updateListing(
        listing.id,
        {
          title: editTitle.trim() || undefined,
          seatType: editSeatType,
          priceCents: parsedPrice,
          quantity: parsedQuantity,
          notes: editNotes,
          eventImageUrl: isEventImageDirty ? uploadedEventImageUrl : undefined
        },
        token
      );
      setListing(updated);
      setEditTitle(updated.title);
      setEditPrice((updated.priceCents / 100).toFixed(2));
      setEditQuantity(String(updated.quantity));
      setEditSeatType(updated.seatType);
      setEditNotes(updated.notes ?? "");
      setEventImageUrl(uploadedEventImageUrl);
      setEventImageDataToUpload("");
      setIsEventImageDirty(false);
      setMessage("Listing updated.");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError
          ? error.issues?.[0]?.message ?? error.message
          : "Could not update listing."
      );
    } finally {
      setIsEditingListing(false);
      setIsUploadingImage(false);
    }
  }

  function applyCroppedImage(dataUrl: string) {
    setImageError("");
    setEventImageUrl(dataUrl);
    setEventImageDataToUpload(dataUrl);
    setIsEventImageDirty(true);
  }

  function clearEventImage() {
    setImageError("");
    setEventImageUrl("");
    setEventImageDataToUpload("");
    setIsEventImageDirty(true);
  }

  async function handleToggleSoldOut() {
    const token = readAuthToken();
    if (!token || !listing) {
      router.push(`/auth/login?returnTo=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }
    setIsTogglingSoldOut(true);
    setErrorMessage("");
    setMessage("");
    try {
      const updated = await updateListing(listing.id, { soldOut: !listing.soldOut }, token);
      setListing(updated);
      setMessage(updated.soldOut ? "Listing marked as sold out." : "Listing is live again.");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError ? error.message : "Could not update listing."
      );
    } finally {
      setIsTogglingSoldOut(false);
    }
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
  const isOwnListing = Boolean(currentUserId) && currentUserId === listing.sellerId;
  const eventEnded = hasEventStarted(listing.eventStartAt);
  const requestsClosed = isSoldOut || eventEnded || hasSentRequest;
  const requestButtonLabel = eventEnded
    ? "Event ended"
    : isSoldOut
      ? "Sold out"
      : hasSentRequest
        ? "Request sent"
        : isSubmitting
          ? "Sending request..."
          : "Request tickets";

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
        Event time: {formatEventDateTime(listing.eventStartAt)}
        {eventEnded ? " (ended)" : ""}
      </p>
      <p className="flex items-baseline gap-2">
        <span className="tabular text-2xl font-semibold text-[var(--foreground)]">
          ${(listing.priceCents / 100).toFixed(2)}
        </span>
        <span className="text-sm text-[var(--muted)]">per ticket · reference price</span>
      </p>
      <p className="muted-text text-sm">Seat type: {listing.seatType}</p>
      <p className="muted-text text-sm">
        {listing.soldOut
          ? "Sold out"
          : `${listing.quantity} ticket${listing.quantity === 1 ? "" : "s"} available`}
      </p>
      {listing.notes ? (
        <p className="muted-text whitespace-pre-line text-sm">{listing.notes}</p>
      ) : null}

      {isOwnListing ? (
        <Alert tone="info">
          This is your listing. Buyer requests show up on your account page.
        </Alert>
      ) : (
        <form className="grid gap-3" onSubmit={handlePurchase}>
          <Input
            label="Tickets requested"
            max={Math.max(1, Math.min(MAX_TICKETS_PER_REQUEST, listing.quantity))}
            min={1}
            inputMode="numeric"
            onChange={(event) => setQuantity(event.target.value)}
            required
            type="number"
            value={quantity}
            disabled={requestsClosed}
          />
          <Input
            label="Your phone number"
            autoComplete="tel"
            inputMode="tel"
            name="tel"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+1 555 555 5555"
            required
            type="tel"
            value={phone}
            disabled={requestsClosed}
          />
          <Button disabled={isSubmitting || requestsClosed} type="submit">
            {requestButtonLabel}
          </Button>
        </form>
      )}
      {canEditListing ? (
        <div className="grid gap-3">
          <Button
            disabled={isTogglingSoldOut}
            onClick={handleToggleSoldOut}
            type="button"
            variant="secondary"
          >
            {isTogglingSoldOut
              ? "Saving..."
              : listing.soldOut
                ? "Relist tickets"
                : "Mark as sold out"}
          </Button>
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
              <label className="grid gap-1.5 text-sm">
                <span className="muted-text">Seat type</span>
                <select
                  value={editSeatType}
                  onChange={(event) => setEditSeatType(event.target.value as Listing["seatType"])}
                  className="h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] outline-none transition focus:border-[rgba(129,140,248,0.6)] focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="GA">GA</option>
                  <option value="VIP">VIP</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </label>
              <Input
                label="Price per ticket (USD)"
                inputMode="decimal"
                min="1"
                onChange={(event) => setEditPrice(event.target.value)}
                step="0.01"
                type="number"
                value={editPrice}
              />
              <Input
                label="Quantity available"
                inputMode="numeric"
                max={20}
                min={1}
                onChange={(event) => setEditQuantity(event.target.value)}
                type="number"
                value={editQuantity}
              />
              <Input
                label="Notes for buyers (optional)"
                maxLength={600}
                onChange={(event) => setEditNotes(event.target.value)}
                placeholder="Section, transfer method, pickup details..."
                value={editNotes}
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
