"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Event } from "@/lib/api/events";
import {
  addEventToWishlist,
  getCurrentUser,
  listWishlistEventIds,
  removeEventFromWishlist
} from "@/lib/api/auth";
import type { Listing } from "@/lib/api/listings";
import {
  getEvent,
  getFeaturedEvent,
  setFeaturedEvent,
  updateEvent,
  uploadEventImage
} from "@/lib/api/events";
import { ApiClientError } from "@/lib/api/client";
import { listListings } from "@/lib/api/listings";
import { readAuthToken } from "@/lib/auth/token-storage";
import { formatEventDateTime, hasEventStarted, toDateTimeLocalValue } from "@/lib/datetime";
import { ListingCard } from "../listings/ListingCard";
import { EventColorBackdrop } from "./EventColorBackdrop";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { EventImagePicker } from "../ui/EventImagePicker";
import { Input } from "../ui/Input";

interface EventDetailProps {
  eventId: string;
}

export function EventDetail({ eventId }: EventDetailProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isTrustedSeller, setIsTrustedSeller] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTopTrustedSeller, setIsTopTrustedSeller] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEventOfMonth, setIsEventOfMonth] = useState(false);
  const [isUpdatingFeatured, setIsUpdatingFeatured] = useState(false);
  const [featuredMessage, setFeaturedMessage] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editStartAt, setEditStartAt] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImageDataToUpload, setEditImageDataToUpload] = useState("");
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editErrorMessage, setEditErrorMessage] = useState("");
  const [listingsErrorMessage, setListingsErrorMessage] = useState("");
  const [wishlistMessage, setWishlistMessage] = useState("");
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEventDetail() {
      setIsLoading(true);
      setErrorMessage("");
      setListingsErrorMessage("");
      try {
        const eventResponse = await getEvent(eventId);
        if (!cancelled) {
          setEvent(eventResponse);
          setEditTitle(eventResponse.title);
          setEditVenue(eventResponse.venue);
          setEditCity(eventResponse.city);
          setEditStartAt(toDateTimeLocalValue(eventResponse.startAt));
          setEditImageUrl(eventResponse.imageUrl ?? "");
          setEditImageDataToUpload("");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiClientError ? error.message : "Could not load event details."
          );
          setListings([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    async function loadListings() {
      try {
        const listingsResponse = await listListings(eventId);
        if (!cancelled) {
          setListings(listingsResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setListings([]);
          setListingsErrorMessage(
            error instanceof ApiClientError
              ? error.message
              : "Could not load ticket listings right now."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingListings(false);
        }
      }
    }

    async function loadCurrentUser() {
      const token = readAuthToken();
      if (!token) {
        return;
      }
      try {
        const [response, wishlistIds] = await Promise.all([
          getCurrentUser(token),
          listWishlistEventIds(token).catch(() => [] as string[])
        ]);
        if (!cancelled) {
          setCurrentUserId(response.user.id);
          setIsTopTrustedSeller(response.user.isTopTrustedSeller);
          setIsAdmin(response.user.isPrimaryTrustedSeller);
          setIsTrustedSeller(response.user.isTrustedSeller);
          setIsWishlisted(wishlistIds.includes(eventId));
        }
      } catch {
        // Ignore and keep page usable.
      }
    }

    async function loadFeatured() {
      try {
        const featured = await getFeaturedEvent();
        if (!cancelled) {
          setIsEventOfMonth(featured?.id === eventId);
        }
      } catch {
        // Badge is optional.
      }
    }

    void loadEventDetail();
    void loadListings();
    void loadCurrentUser();
    void loadFeatured();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (isLoading) {
    return (
      <p className="muted-text text-sm" role="status" aria-live="polite">
        Loading event details...
      </p>
    );
  }

  if (errorMessage) {
    return <Alert tone="error" announce="assertive">{errorMessage}</Alert>;
  }

  if (!event) {
    return <p className="muted-text text-sm">Event not found.</p>;
  }

  const canEditEvent = Boolean(currentUserId) && (currentUserId === event.organizerId || isTopTrustedSeller);

  async function handleEditEvent(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const token = readAuthToken();
    if (!token || !event) {
      setWishlistMessage("Log in to edit this event.");
      return;
    }

    if (editTitle.trim().length < 2 || editCity.trim().length < 2) {
      setEditErrorMessage("Title and city need at least 2 characters.");
      return;
    }
    const parsedStartAt = editStartAt ? new Date(editStartAt) : null;
    if (parsedStartAt && Number.isNaN(parsedStartAt.getTime())) {
      setEditErrorMessage("Enter a valid start date and time.");
      return;
    }
    const normalizedStartAt = parsedStartAt ? parsedStartAt.toISOString() : event.startAt;
    setIsSavingEvent(true);
    setIsUploadingImage(Boolean(editImageDataToUpload));
    setEditErrorMessage("");
    try {
      // An empty string tells the API to clear the image (undefined would leave it unchanged).
      let uploadedImageUrl = editImageUrl;
      if (editImageDataToUpload) {
        uploadedImageUrl = await uploadEventImage(editImageDataToUpload, token);
      }
      const updated = await updateEvent(
        event.id,
        {
          title: editTitle.trim(),
          venue: editVenue.trim(),
          city: editCity.trim(),
          startAt: normalizedStartAt,
          imageUrl: uploadedImageUrl
        },
        token
      );
      setEvent(updated);
      setEditTitle(updated.title);
      setEditVenue(updated.venue);
      setEditCity(updated.city);
      setEditStartAt(toDateTimeLocalValue(updated.startAt));
      setEditImageUrl(updated.imageUrl ?? "");
      setEditImageDataToUpload("");
      setWishlistMessage("Event updated.");
    } catch (error) {
      setEditErrorMessage(
        error instanceof ApiClientError
          ? error.issues?.[0]?.message ?? error.message
          : "Could not update event."
      );
    } finally {
      setIsSavingEvent(false);
      setIsUploadingImage(false);
    }
  }

  function applyCroppedImage(dataUrl: string) {
    setImageError("");
    setEditImageUrl(dataUrl);
    setEditImageDataToUpload(dataUrl);
  }

  function clearEditImage() {
    setImageError("");
    setEditImageUrl("");
    setEditImageDataToUpload("");
  }

  async function handleToggleWishlist() {
    const token = readAuthToken();
    if (!token || !event) {
      router.push(`/auth/login?returnTo=${encodeURIComponent(`/events/${eventId}`)}`);
      return;
    }
    const next = !isWishlisted;
    setIsUpdatingWishlist(true);
    setIsWishlisted(next);
    setWishlistMessage("");
    try {
      if (next) {
        await addEventToWishlist(event.id, token);
      } else {
        await removeEventFromWishlist(event.id, token);
      }
      setWishlistMessage(next ? "Added to wishlist." : "Removed from wishlist.");
    } catch (error) {
      setIsWishlisted(!next);
      setWishlistMessage(
        error instanceof ApiClientError ? error.message : "Could not update wishlist."
      );
    } finally {
      setIsUpdatingWishlist(false);
    }
  }

  async function handleToggleEventOfMonth() {
    const token = readAuthToken();
    if (!token || !event) {
      return;
    }
    const next = !isEventOfMonth;
    setIsUpdatingFeatured(true);
    setFeaturedMessage("");
    try {
      await setFeaturedEvent(next ? event.id : null, token);
      setIsEventOfMonth(next);
      setFeaturedMessage(
        next
          ? "This is now the Event of the Month on the homepage. It replaces any previous pick."
          : "Removed as Event of the Month."
      );
    } catch (error) {
      setFeaturedMessage(
        error instanceof ApiClientError ? error.message : "Could not update the Event of the Month."
      );
    } finally {
      setIsUpdatingFeatured(false);
    }
  }

  const eventEnded = hasEventStarted(event.startAt);
  const shouldShowVenue = Boolean(event.venue?.trim()) && event.venue.trim() !== "TBD";
  const shouldShowDescription =
    Boolean(event.description?.trim()) &&
    event.description?.trim() !== "User-submitted event pending schedule confirmation.";
  const cheapestListing = listings.reduce<Listing | null>(
    (cheapest, listing) => (!cheapest || listing.priceCents < cheapest.priceCents ? listing : cheapest),
    null
  );
  const canSell = isTrustedSeller && !eventEnded;
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
  const metaLine = [formatEventDateTime(event.startAt) + (eventEnded ? " (ended)" : ""), shouldShowVenue ? event.venue : null]
    .filter(Boolean)
    .join(" • ");

  const wishlistButton = (
    <button
      type="button"
      disabled={isUpdatingWishlist}
      aria-pressed={isWishlisted}
      onClick={handleToggleWishlist}
      className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/60 px-3.5 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60"
    >
      <span aria-hidden="true">{isWishlisted ? "★" : "☆"}</span>
      {isWishlisted ? "Wishlisted" : "Wishlist"}
    </button>
  );

  return (
    // Desktop: big event image on the left (stays in view while scrolling); title, Buy/Sell and
    // the ticket list on the right. Phones stack image, then details, then tickets.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:items-start lg:gap-x-12">
      {/* Colors sampled from the event's image tint the page behind the cards. */}
      <EventColorBackdrop imageUrl={event.imageUrl} />

      <Link
        href="/events"
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] lg:col-span-2"
      >
        <span aria-hidden="true">←</span>
        Back to events
      </Link>

      <div className="grid gap-6 lg:sticky lg:top-24">
        <div className="relative mx-auto aspect-square w-full max-w-[42rem] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-elevated)]">
          {event.imageUrl ? (
            <img
              alt={`${event.title} event image`}
              className="h-full w-full object-cover"
              src={event.imageUrl}
            />
          ) : null}
          {wishlistButton}
        </div>

        <div className="hidden gap-2 lg:grid">
          <EventInfo
            city={event.city}
            venue={shouldShowVenue ? event.venue : ""}
            artists={event.artists}
            description={shouldShowDescription ? event.description : undefined}
          />
        </div>

        {isAdmin && !eventEnded ? (
          <Button
            variant="secondary"
            type="button"
            className={`w-full ${isEventOfMonth ? "!border-[var(--pink)] !text-[var(--pink-soft)]" : ""}`}
            disabled={isUpdatingFeatured}
            aria-pressed={isEventOfMonth}
            onClick={handleToggleEventOfMonth}
          >
            {isUpdatingFeatured
              ? "Saving..."
              : isEventOfMonth
                ? "✓ Event of the Month"
                : "Make Event of the Month"}
          </Button>
        ) : null}
        {featuredMessage ? <Alert tone="info">{featuredMessage}</Alert> : null}
        {canEditEvent ? (
          <div className="grid gap-3">
            <Button
              onClick={() => setIsEditFormOpen((current) => !current)}
              type="button"
              variant="secondary"
            >
              {isEditFormOpen ? "Close edit event" : "Edit event"}
            </Button>
            {isEditFormOpen ? (
              <form
                className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4"
                onSubmit={handleEditEvent}
              >
                <h2 className="brand-heading text-base font-semibold">Edit event</h2>
                <Input
                  label="Event title"
                  onChange={(inputEvent) => setEditTitle(inputEvent.target.value)}
                  value={editTitle}
                />
                <Input
                  label="Venue"
                  onChange={(inputEvent) => setEditVenue(inputEvent.target.value)}
                  value={editVenue}
                />
                <Input
                  label="City"
                  onChange={(inputEvent) => setEditCity(inputEvent.target.value)}
                  value={editCity}
                />
                <Input
                  label="Start date/time"
                  onChange={(inputEvent) => setEditStartAt(inputEvent.target.value)}
                  type="datetime-local"
                  value={editStartAt}
                />
                <EventImagePicker
                  variant="field"
                  label="Event image"
                  helperText="Choose a photo, then crop what shows on cards"
                  valueUrl={editImageUrl}
                  onChange={applyCroppedImage}
                  onClear={clearEditImage}
                  errorMessage={imageError || undefined}
                />
                {editErrorMessage ? (
                  <Alert tone="error" announce="assertive">
                    {editErrorMessage}
                  </Alert>
                ) : null}
                <Button variant="secondary" disabled={isSavingEvent} type="submit">
                  {isSavingEvent
                    ? isUploadingImage
                      ? "Uploading image..."
                      : "Saving..."
                    : "Save event changes"}
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid content-start gap-5">
        <div className="grid gap-1.5">
          {isEventOfMonth ? (
            <p className="w-fit rounded-full border border-[var(--pink)] px-2.5 py-0.5 text-xs font-medium text-[var(--pink-soft)]">
              Event of the Month
            </p>
          ) : null}
          <h1 className="brand-heading text-4xl font-extrabold leading-tight text-[var(--foreground)] sm:text-5xl">
            {event.title}
          </h1>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-base text-[var(--muted)] sm:text-lg">
            <p>{metaLine}</p>
            <p className="hidden items-center gap-1.5 text-[var(--foreground)] lg:flex">
              <PinIcon />
              {event.city}
            </p>
          </div>
        </div>

        <div className={`grid gap-4 ${canSell ? "grid-cols-2" : "grid-cols-1"}`}>
          {cheapestListing && !eventEnded ? (
            <Link
              href={`/listings/${cheapestListing.id}`}
              className="flex h-16 items-center justify-center gap-2 rounded-full border border-white/10 bg-[#44b53c] text-xl font-medium text-white transition-colors hover:bg-[#4cc043] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:h-[4.5rem] sm:text-2xl"
            >
              Buy <span className="tabular-nums">{formatPrice(cheapestListing.priceCents)}</span>
            </Link>
          ) : (
            <span className="flex h-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xl font-medium text-[var(--muted)] sm:h-[4.5rem] sm:text-2xl">
              {eventEnded ? "Event ended" : isLoadingListings ? "Buy" : "No tickets yet"}
            </span>
          )}
          {canSell ? (
            <Link
              href={`/listings/new?eventId=${encodeURIComponent(event.id)}`}
              className="flex h-16 items-center justify-center rounded-full bg-white text-xl font-medium text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:h-[4.5rem] sm:text-2xl"
            >
              Sell
            </Link>
          ) : null}
        </div>
        {wishlistMessage ? <Alert tone="info">{wishlistMessage}</Alert> : null}

        <section aria-labelledby="tickets-heading" className="grid gap-1">
          <h2
            id="tickets-heading"
            className="flex h-12 items-center justify-center rounded-full border border-white/70 text-base font-medium text-[var(--foreground)]"
          >
            Tickets available
          </h2>
          {listingsErrorMessage ? <Alert tone="error">{listingsErrorMessage}</Alert> : null}
          {isLoadingListings ? (
            <p className="muted-text px-1 py-4 text-sm" role="status" aria-live="polite">
              Loading listings...
            </p>
          ) : listings.length ? (
            <div className="grid">
              {[...listings]
                .sort((a, b) => a.priceCents - b.priceCents)
                .map((listing) => (
                  <ListingCard listing={listing} imageUrl={event.imageUrl} key={listing.id} />
                ))}
            </div>
          ) : (
            <p className="muted-text px-1 py-4 text-sm">No active listings yet for this event.</p>
          )}
        </section>

        <div className="grid gap-2 lg:hidden">
          <EventInfo
            city={event.city}
            venue={shouldShowVenue ? event.venue : ""}
            artists={event.artists}
            description={shouldShowDescription ? event.description : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

/** Venue, city, lineup and description, shown under the image on desktop and after the tickets on phones. */
function EventInfo({
  venue,
  city,
  artists,
  description
}: {
  venue: string;
  city: string;
  artists: string[];
  description?: string;
}) {
  return (
    <>
      <h2 className="flex items-center gap-2 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
        <PinIcon />
        {venue || city}
      </h2>
      {venue ? <p className="muted-text text-base">{city}</p> : null}
      {artists.length ? <p className="muted-text text-sm">Artists: {artists.join(", ")}</p> : null}
      {description ? <p className="text-sm text-white/90">{description}</p> : null}
    </>
  );
}
