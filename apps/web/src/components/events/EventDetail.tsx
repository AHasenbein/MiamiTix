"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Event } from "@/lib/api/events";
import { addEventToWishlist, getCurrentUser } from "@/lib/api/auth";
import type { Listing } from "@/lib/api/listings";
import { getEvent, updateEvent, uploadEventImage } from "@/lib/api/events";
import { ApiClientError } from "@/lib/api/client";
import { listListings } from "@/lib/api/listings";
import { readAuthToken } from "@/lib/auth/token-storage";
import { toDateTimeLocalValue } from "@/lib/datetime";
import { ListingCard } from "../listings/ListingCard";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { ButtonLink } from "../ui/ButtonLink";
import { EventImagePicker } from "../ui/EventImagePicker";
import { Input } from "../ui/Input";
import { SurfaceCard } from "../ui/SurfaceCard";

interface EventDetailProps {
  eventId: string;
}

export function EventDetail({ eventId }: EventDetailProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTopTrustedSeller, setIsTopTrustedSeller] = useState(false);
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
        // Ignore and keep page usable.
      }
    }

    void loadEventDetail();
    void loadListings();
    void loadCurrentUser();

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

    const normalizedStartAt = editStartAt ? new Date(editStartAt).toISOString() : event.startAt;
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
        error instanceof ApiClientError ? error.message : "Could not update event."
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

  const shouldShowVenue = Boolean(event.venue?.trim()) && event.venue.trim() !== "TBD";
  const shouldShowDescription =
    Boolean(event.description?.trim()) &&
    event.description?.trim() !== "User-submitted event pending schedule confirmation.";

  return (
    <div className="grid gap-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/events" className="muted-text underline underline-offset-4">
          Back to events
        </Link>
        <span className="muted-text">/</span>
        <span className="muted-text">Event details</span>
      </nav>
      <SurfaceCard className="grid gap-4 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="aspect-square w-full max-w-[14rem] shrink-0 self-start overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] sm:w-56">
            {event.imageUrl ? (
              <img
                alt={`${event.title} event image`}
                className="h-full w-full object-cover"
                src={event.imageUrl}
              />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(135deg,rgba(62,164,255,0.22),rgba(255,255,255,0.06))]" />
            )}
          </div>
          <div className="grid min-w-0 flex-1 gap-2">
            <p className="muted-text text-xs uppercase tracking-[0.18em]">{event.city}</p>
            <h1 className="brand-heading text-2xl font-semibold">{event.title}</h1>
            {event.artists.length ? (
              <p className="muted-text text-sm">Artists: {event.artists.join(", ")}</p>
            ) : null}
            {event.isHouseMusic ? (
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[rgba(62,164,255,0.95)]">
                Featured Event
              </p>
            ) : null}
            <p className="muted-text text-sm">
              {shouldShowVenue ? `${event.venue} - ` : ""}
              {new Date(event.startAt).toLocaleString()}
            </p>
            {shouldShowDescription ? (
              <p className="text-sm text-white/90">{event.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
          <ButtonLink href="/listings/new" className="w-full sm:w-auto">
            <span className="sm:hidden">List this event</span>
            <span className="hidden sm:inline">Trusted sellers: list this event</span>
          </ButtonLink>
          <Button
            variant="secondary"
            type="button"
            className="w-full sm:w-auto"
            onClick={async () => {
              const token = readAuthToken();
              if (!token) {
                setWishlistMessage("Log in to save events to your wishlist.");
                return;
              }
              try {
                await addEventToWishlist(event.id, token);
                setWishlistMessage("Added to wishlist.");
              } catch (error) {
                setWishlistMessage(
                  error instanceof ApiClientError ? error.message : "Could not update wishlist."
                );
              }
            }}
          >
            ☆ Wishlist
          </Button>
        </div>
        {wishlistMessage ? <Alert tone="info">{wishlistMessage}</Alert> : null}
        {canEditEvent ? (
          <div className="mt-2 grid gap-3">
            <Button
              onClick={() => setIsEditFormOpen((current) => !current)}
              type="button"
              variant="secondary"
            >
              {isEditFormOpen ? "Close edit event" : "Edit event"}
            </Button>
            {isEditFormOpen ? (
              <form
                className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-4"
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
      </SurfaceCard>

      <section className="grid gap-3">
        <h2 className="brand-heading text-lg font-semibold">Available ticket listings</h2>
        {listingsErrorMessage ? <Alert tone="error">{listingsErrorMessage}</Alert> : null}
        {listings.length ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {listings.map((listing) => (
              <ListingCard listing={listing} key={listing.id} />
            ))}
          </div>
        ) : (
          <SurfaceCard className="p-3" elevated={false}>
            <p className="muted-text text-sm">No active listings yet for this event.</p>
          </SurfaceCard>
        )}
      </section>
    </div>
  );
}
