"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { AuthUser } from "@/lib/api/auth";
import { getCurrentUser } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import { uploadEventImage } from "@/lib/api/events";
import { createListing, listMarketEventSuggestions } from "@/lib/api/listings";
import { readAuthToken } from "@/lib/auth/token-storage";
import { toDateTimeLocalValue } from "@/lib/datetime";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { EventImagePicker } from "../ui/EventImagePicker";
import { Input } from "../ui/Input";
import { SurfaceCard } from "../ui/SurfaceCard";

function toIsoFromDateTimeLocal(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

const seatTypes = [
  { value: "GA" as const, label: "GA", hint: "General admission" },
  { value: "VIP" as const, label: "VIP", hint: "Premium access" },
  { value: "OTHER" as const, label: "Other", hint: "Custom seat type" }
];

export function CreateListingForm() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [eventId, setEventId] = useState<string | undefined>(undefined);
  const [eventTitle, setEventTitle] = useState("");
  const [eventArtist, setEventArtist] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [eventDateTime, setEventDateTime] = useState("");
  const [eventImageUrl, setEventImageUrl] = useState("");
  const [eventImageDataToUpload, setEventImageDataToUpload] = useState("");
  // Read inside the debounced suggestion effect without re-running it on every image change.
  const hasPendingImageUploadRef = useRef(false);
  const [debouncedEventTitle, setDebouncedEventTitle] = useState("");
  const [debouncedEventArtist, setDebouncedEventArtist] = useState("");
  const [debouncedEventCity, setDebouncedEventCity] = useState("");
  const [seatType, setSeatType] = useState<"GA" | "VIP" | "OTHER">("GA");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [marketPriceCents, setMarketPriceCents] = useState<number | null>(null);
  const [eventSuggestions, setEventSuggestions] = useState<
    Array<{
      eventId: string;
      title: string;
      venue: string;
      city: string;
      startAt: string;
      artists: string[];
      imageUrl?: string;
      activeListingCount: number;
      currentPriceCents: number;
    }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [priceError, setPriceError] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [eventTitleError, setEventTitleError] = useState("");
  const [eventVenueError, setEventVenueError] = useState("");
  const [eventCityError, setEventCityError] = useState("");
  const [eventDateTimeError, setEventDateTimeError] = useState("");
  const [eventImageError, setEventImageError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = readAuthToken();
    if (!token) {
      router.replace(`/auth/login?returnTo=${encodeURIComponent("/listings/new")}`);
      return;
    }

    void getCurrentUser(token)
      .then((response) => {
        if (!cancelled) {
          setCurrentUser(response.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          router.replace(`/auth/login?returnTo=${encodeURIComponent("/listings/new")}`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedEventTitle(eventTitle.trim());
      setDebouncedEventArtist(eventArtist.trim());
      setDebouncedEventCity(eventCity.trim());
    }, 450);

    return () => {
      clearTimeout(timeout);
    };
  }, [eventTitle, eventArtist, eventCity]);

  useEffect(() => {
    let cancelled = false;
    async function loadEventSuggestions() {
      if (!debouncedEventTitle) {
        setEventSuggestions([]);
        setMarketPriceCents(null);
        setEventId(undefined);
        return;
      }

      try {
        const response = await listMarketEventSuggestions({
          query: debouncedEventTitle,
          artist: debouncedEventArtist || undefined,
          city: debouncedEventCity || undefined,
          limit: 8
        });
        if (!cancelled) {
          setEventSuggestions(response);
          const exactMatch = response.find(
            (item) =>
              item.title.toLowerCase() === debouncedEventTitle.toLowerCase() &&
              (debouncedEventCity
                ? item.city.toLowerCase() === debouncedEventCity.toLowerCase()
                : true)
          );
          setMarketPriceCents(exactMatch?.currentPriceCents ?? null);
          if (exactMatch) {
            setEventId(exactMatch.eventId);
            setEventVenue(exactMatch.venue);
            setEventCity(exactMatch.city);
            setEventDateTime(toDateTimeLocalValue(exactMatch.startAt));
            if (!hasPendingImageUploadRef.current) {
              setEventImageUrl(exactMatch.imageUrl ?? "");
            }
          } else {
            setEventId(undefined);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiClientError ? error.message : "Could not load events for listing."
          );
        }
      }
    }

    void loadEventSuggestions();
    return () => {
      cancelled = true;
    };
  }, [debouncedEventTitle, debouncedEventArtist, debouncedEventCity]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = readAuthToken();
    if (!token) {
      router.push(`/auth/login?returnTo=${encodeURIComponent("/listings/new")}`);
      return;
    }
    if (!currentUser?.isTrustedSeller) {
      setErrorMessage("Your account is not approved to list tickets yet.");
      return;
    }

    if (!eventTitle.trim()) {
      setEventTitleError("Event title is required.");
      return;
    }
    setEventTitleError("");
    if (!eventVenue.trim()) {
      setEventVenueError("Venue is required.");
      return;
    }
    setEventVenueError("");
    if (!eventCity.trim()) {
      setEventCityError("City is required.");
      return;
    }
    setEventCityError("");
    const eventStartAtIso = toIsoFromDateTimeLocal(eventDateTime);
    if (!eventStartAtIso) {
      setEventDateTimeError("Event date and time are required.");
      return;
    }
    setEventDateTimeError("");

    const parsedPrice = Number(price);
    const parsedQuantity = Number(quantity);
    const priceCents = Math.round(parsedPrice * 100);

    if (!Number.isFinite(parsedPrice) || priceCents < 100) {
      setPriceError("Price must be at least $1.00.");
      return;
    }
    setPriceError("");

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 20) {
      setQuantityError("Quantity must be a whole number from 1 to 20.");
      return;
    }
    setQuantityError("");

    setIsSubmitting(true);
    setIsUploadingImage(Boolean(eventImageDataToUpload));
    setErrorMessage("");
    try {
      let uploadedImageUrl = eventImageUrl || undefined;
      if (eventImageDataToUpload) {
        uploadedImageUrl = await uploadEventImage(eventImageDataToUpload, token);
      }
      const listing = await createListing(
        {
          eventId,
          eventTitle: eventTitle.trim(),
          eventArtist: eventArtist.trim() || undefined,
          eventVenue: eventVenue.trim(),
          eventCity: eventCity.trim(),
          eventStartAt: eventStartAtIso,
          eventImageUrl: uploadedImageUrl,
          seatType,
          priceCents,
          quantity: parsedQuantity,
          title: undefined
        },
        token
      );
      router.push(`/listings/${listing.id}`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        const issueText = error.issues?.[0]?.message;
        setErrorMessage(issueText ?? error.message);
      } else {
        setErrorMessage("Could not create listing.");
      }
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  }

  function applyCroppedImage(dataUrl: string) {
    setEventImageError("");
    setEventImageUrl(dataUrl);
    setEventImageDataToUpload(dataUrl);
    hasPendingImageUploadRef.current = true;
  }

  function clearEventImage() {
    setEventImageError("");
    setEventImageUrl("");
    setEventImageDataToUpload("");
    hasPendingImageUploadRef.current = false;
  }

  function selectSuggestion(eventSuggestion: (typeof eventSuggestions)[number]) {
    setEventId(eventSuggestion.eventId);
    setEventTitle(eventSuggestion.title);
    setEventVenue(eventSuggestion.venue);
    setEventCity(eventSuggestion.city);
    setEventImageUrl(eventSuggestion.imageUrl ?? "");
    setEventImageDataToUpload("");
    hasPendingImageUploadRef.current = false;
    setEventDateTime(toDateTimeLocalValue(eventSuggestion.startAt));
    setMarketPriceCents(eventSuggestion.currentPriceCents);
  }

  const canPublish = Boolean(currentUser?.isTrustedSeller) && !isSubmitting;
  const publishLabel = isSubmitting
    ? isUploadingImage
      ? "Uploading image..."
      : "Publishing..."
    : "Publish listing";

  return (
    <>
      {/* Mobile — dedicated listing flow */}
      <form
        className="md:hidden"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 pb-28">
          <header className="grid gap-2 px-1 pt-1">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--neon-pink-soft)]">
              Sell tickets
            </p>
            <h1 className="brand-heading text-[1.85rem] font-semibold leading-tight">
              List your tickets
            </h1>
            <p className="muted-text text-sm leading-relaxed">
              Match an event, set your price, and publish in under a minute.
            </p>
          </header>

          {currentUser && !currentUser.isTrustedSeller ? (
            <Alert tone="info">
              Selling is restricted to trusted accounts. Ask support to add your email to the trusted
              seller allowlist.
            </Alert>
          ) : null}

          <EventImagePicker
            variant="hero"
            valueUrl={eventImageUrl}
            onChange={applyCroppedImage}
            onClear={clearEventImage}
            errorMessage={eventImageError || undefined}
            helperText="Optional — crop to frame what shows on cards"
          />

          <section className="grid gap-3 rounded-[1.15rem] border border-[var(--border)] bg-[rgba(17,12,31,0.92)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="brand-heading text-lg font-semibold">1 · Event</h2>
              {eventId ? (
                <span className="rounded-full border border-[rgba(34,211,255,0.4)] bg-[rgba(34,211,255,0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--neon-blue-soft)]">
                  Matched
                </span>
              ) : null}
            </div>
            <Input
              label="Event name"
              onChange={(event) => {
                setEventTitle(event.target.value);
                setEventId(undefined);
              }}
              required
              value={eventTitle}
              placeholder="What show are you selling?"
              errorMessage={eventTitleError || undefined}
            />
            <Input
              label="Artist (optional)"
              onChange={(event) => setEventArtist(event.target.value)}
              value={eventArtist}
              placeholder="Headliner or lineup"
            />
            {eventSuggestions.length ? (
              <div className="grid gap-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--silver)]">
                  Selling now — tap to autofill
                </p>
                <div className="grid gap-2">
                  {eventSuggestions.map((eventSuggestion) => {
                    const selected = eventId === eventSuggestion.eventId;
                    return (
                      <button
                        key={eventSuggestion.eventId}
                        type="button"
                        onClick={() => selectSuggestion(eventSuggestion)}
                        className={`min-h-14 rounded-[0.9rem] border px-3.5 py-3 text-left transition active:scale-[0.99] ${
                          selected
                            ? "border-[rgba(255,46,168,0.65)] bg-[rgba(255,46,168,0.14)] shadow-[0_0_22px_rgba(255,46,168,0.25)]"
                            : "border-[var(--border)] bg-[rgba(232,235,243,0.04)]"
                        }`}
                      >
                        <p className="text-sm font-semibold text-white">{eventSuggestion.title}</p>
                        <p className="muted-text mt-0.5 text-xs leading-snug">
                          {eventSuggestion.venue ? `${eventSuggestion.venue} · ` : ""}
                          {eventSuggestion.city} · from $
                          {(eventSuggestion.currentPriceCents / 100).toFixed(2)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          <section className="grid gap-3 rounded-[1.15rem] border border-[var(--border)] bg-[rgba(17,12,31,0.92)] p-4">
            <h2 className="brand-heading text-lg font-semibold">2 · When & where</h2>
            <div className="grid gap-3">
              <Input
                label="Venue"
                onChange={(event) => {
                  setEventVenue(event.target.value);
                  setEventId(undefined);
                }}
                value={eventVenue}
                placeholder="Venue"
                required
                errorMessage={eventVenueError || undefined}
              />
              <Input
                label="City"
                onChange={(event) => {
                  setEventCity(event.target.value);
                  setEventId(undefined);
                }}
                value={eventCity}
                placeholder="City"
                required
                errorMessage={eventCityError || undefined}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Date"
                  type="date"
                  required
                  value={eventDateTime ? eventDateTime.slice(0, 10) : ""}
                  onChange={(event) => {
                    const currentTime = eventDateTime.includes("T")
                      ? eventDateTime.slice(11, 16)
                      : "19:00";
                    setEventDateTime(`${event.target.value}T${currentTime}`);
                  }}
                  errorMessage={eventDateTimeError || undefined}
                />
                <Input
                  label="Time"
                  type="time"
                  required
                  value={eventDateTime.includes("T") ? eventDateTime.slice(11, 16) : ""}
                  onChange={(event) => {
                    const currentDate = eventDateTime.includes("T")
                      ? eventDateTime.slice(0, 10)
                      : "";
                    if (!currentDate) {
                      setEventDateTimeError("Set a date before selecting time.");
                      return;
                    }
                    setEventDateTime(`${currentDate}T${event.target.value}`);
                    setEventDateTimeError("");
                  }}
                />
              </div>
            </div>
          </section>

          <section className="grid gap-3 rounded-[1.15rem] border border-[var(--border)] bg-[rgba(17,12,31,0.92)] p-4">
            <h2 className="brand-heading text-lg font-semibold">3 · Tickets & price</h2>
            <div className="grid gap-2">
              <p className="muted-text text-sm">Seat type</p>
              <div className="grid grid-cols-3 gap-2">
                {seatTypes.map((option) => {
                  const active = seatType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSeatType(option.value)}
                      className={`min-h-16 rounded-[0.9rem] border px-2 py-2.5 text-center transition active:scale-[0.98] ${
                        active
                          ? "border-[rgba(34,211,255,0.65)] bg-[rgba(34,211,255,0.16)] shadow-[0_0_20px_rgba(34,211,255,0.28)]"
                          : "border-[var(--border)] bg-[rgba(232,235,243,0.04)]"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-white">{option.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-tight text-[var(--silver)]">
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {marketPriceCents ? (
              <Alert tone="info">
                Current market floor: ${(marketPriceCents / 100).toFixed(2)} per ticket.
              </Alert>
            ) : (
              <Alert tone="info">
                No market data yet — your price becomes the first reference.
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Price (USD)"
                errorMessage={priceError || undefined}
                min={1}
                onChange={(event) => setPrice(event.target.value)}
                required
                step="0.01"
                type="number"
                value={price}
                placeholder="0.00"
              />
              <Input
                label="Quantity"
                errorMessage={quantityError || undefined}
                max={20}
                min={1}
                onChange={(event) => setQuantity(event.target.value)}
                required
                type="number"
                value={quantity}
              />
            </div>
          </section>

          {errorMessage ? (
            <Alert tone="error" announce="assertive">
              {errorMessage}
            </Alert>
          ) : null}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[rgba(7,6,15,0.94)] px-[3vw] pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-lg gap-2">
            <Button
              variant="ghost"
              type="button"
              className="flex-1"
              onClick={() => router.push("/listings/mine")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button className="flex-[1.4]" disabled={!canPublish} type="submit">
              {publishLabel}
            </Button>
          </div>
        </div>
      </form>

      {/* Desktop — original card layout */}
      <SurfaceCard className="hidden max-w-3xl gap-6 p-5 sm:p-8 md:grid">
        <header className="grid gap-2">
          <p className="muted-text text-xs uppercase tracking-[0.18em]">sell tickets</p>
          <h1 className="brand-heading text-2xl font-semibold sm:text-3xl">List tickets</h1>
          <p className="muted-text text-sm">
            Type an event name, set seat type and price, then publish.
          </p>
        </header>
        {currentUser && !currentUser.isTrustedSeller ? (
          <Alert tone="info">
            Selling is restricted to trusted accounts. Ask support to add your email to the trusted
            seller allowlist.
          </Alert>
        ) : null}
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Event"
              onChange={(event) => {
                setEventTitle(event.target.value);
                setEventId(undefined);
              }}
              required
              value={eventTitle}
              placeholder="Event name"
              errorMessage={eventTitleError || undefined}
            />
            <Input
              label="Artist (optional)"
              onChange={(event) => setEventArtist(event.target.value)}
              value={eventArtist}
              placeholder="Artist name"
            />
            <Input
              label="Venue"
              onChange={(event) => {
                setEventVenue(event.target.value);
                setEventId(undefined);
              }}
              value={eventVenue}
              placeholder="Venue"
              required
              errorMessage={eventVenueError || undefined}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="City"
              onChange={(event) => {
                setEventCity(event.target.value);
                setEventId(undefined);
              }}
              value={eventCity}
              placeholder="City"
              required
              errorMessage={eventCityError || undefined}
            />
            <EventImagePicker
              variant="field"
              valueUrl={eventImageUrl}
              onChange={applyCroppedImage}
              onClear={clearEventImage}
              errorMessage={eventImageError || undefined}
              label="Event image (optional)"
              helperText="Choose a photo, then crop the frame"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Event date"
              type="date"
              required
              value={eventDateTime ? eventDateTime.slice(0, 10) : ""}
              onChange={(event) => {
                const currentTime = eventDateTime.includes("T")
                  ? eventDateTime.slice(11, 16)
                  : "19:00";
                setEventDateTime(`${event.target.value}T${currentTime}`);
              }}
              errorMessage={eventDateTimeError || undefined}
            />
            <Input
              label="Event time"
              type="time"
              required
              value={eventDateTime.includes("T") ? eventDateTime.slice(11, 16) : ""}
              onChange={(event) => {
                const currentDate = eventDateTime.includes("T")
                  ? eventDateTime.slice(0, 10)
                  : "";
                if (!currentDate) {
                  setEventDateTimeError("Set a date before selecting time.");
                  return;
                }
                setEventDateTime(`${currentDate}T${event.target.value}`);
                setEventDateTimeError("");
              }}
            />
          </div>
          {eventSuggestions.length ? (
            <div className="grid gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2">
              <p className="muted-text px-2 pt-1 text-xs uppercase tracking-[0.14em]">
                Selling now
              </p>
              {eventSuggestions.map((eventSuggestion) => (
                <button
                  key={eventSuggestion.eventId}
                  type="button"
                  onClick={() => selectSuggestion(eventSuggestion)}
                  className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-3 text-left transition hover:bg-[rgba(255,255,255,0.06)] active:bg-[rgba(255,255,255,0.08)]"
                >
                  <p className="text-sm text-[var(--foreground)]">{eventSuggestion.title}</p>
                  <p className="muted-text text-xs">
                    {eventSuggestion.venue ? `${eventSuggestion.venue} - ` : ""}
                    {eventSuggestion.city} - from $
                    {(eventSuggestion.currentPriceCents / 100).toFixed(2)} (
                    {eventSuggestion.activeListingCount} listings)
                  </p>
                </button>
              ))}
            </div>
          ) : null}
          <label className="grid gap-1.5 text-sm">
            <span className="muted-text">Seat type</span>
            <select
              value={seatType}
              onChange={(event) => setSeatType(event.target.value as "GA" | "VIP" | "OTHER")}
              className="h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] outline-none transition focus:border-[rgba(62,164,255,0.6)] focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="GA">GA</option>
              <option value="VIP">VIP</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>
          {marketPriceCents ? (
            <Alert tone="info">
              Current market floor: ${(marketPriceCents / 100).toFixed(2)} per ticket.
            </Alert>
          ) : (
            <Alert tone="info">
              No existing market data for this event yet. Your price will set the first reference.
            </Alert>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Price per ticket (USD)"
              errorMessage={priceError || undefined}
              min={1}
              onChange={(event) => setPrice(event.target.value)}
              required
              step="0.01"
              type="number"
              value={price}
            />
            <Input
              label="Quantity"
              errorMessage={quantityError || undefined}
              max={20}
              min={1}
              onChange={(event) => setQuantity(event.target.value)}
              required
              type="number"
              value={quantity}
            />
          </div>
          {errorMessage ? (
            <Alert tone="error" announce="assertive">
              {errorMessage}
            </Alert>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button disabled={!canPublish} type="submit">
              {publishLabel}
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => router.push("/listings/mine")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SurfaceCard>
    </>
  );
}
