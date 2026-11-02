import { apiRequest } from "./client";

export interface Listing {
  id: string;
  eventId: string;
  eventTitle: string;
  eventCity: string;
  eventStartAt: string;
  sellerId: string;
  title: string;
  seatType: "GA" | "VIP" | "OTHER";
  priceCents: number;
  quantity: number;
  notes?: string;
  soldOut: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListingsResponse {
  listings: Listing[];
}

interface ListingResponse {
  listing: Listing;
}

export interface CreateListingInput {
  eventId?: string;
  eventTitle?: string;
  eventArtist?: string;
  eventVenue?: string;
  eventCity: string;
  eventStartAt?: string;
  eventImageUrl?: string;
  title?: string;
  seatType: "GA" | "VIP" | "OTHER";
  priceCents: number;
  quantity: number;
  notes?: string;
}

export interface UpdateListingInput {
  title?: string;
  seatType?: "GA" | "VIP" | "OTHER";
  priceCents?: number;
  quantity?: number;
  eventImageUrl?: string;
  notes?: string;
  soldOut?: boolean;
}

export interface PurchaseResult {
  requestId: string;
  listingId: string;
  requestedQuantity: number;
  buyerPhone: string;
  status: "pending" | "contacted" | "cancelled";
  message: string;
}

export async function listListings(eventId?: string): Promise<Listing[]> {
  const suffix = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
  const response = await apiRequest<ListingsResponse>(`/api/v1/listings${suffix}`);
  return response.listings;
}

export async function getListing(listingId: string): Promise<Listing> {
  const response = await apiRequest<ListingResponse>(`/api/v1/listings/${listingId}`);
  return response.listing;
}

export async function listMyListings(token: string): Promise<Listing[]> {
  const response = await apiRequest<ListingsResponse>("/api/v1/listings/mine", { token });
  return response.listings;
}

export async function createListing(input: CreateListingInput, token: string): Promise<Listing> {
  const response = await apiRequest<ListingResponse>("/api/v1/listings", {
    method: "POST",
    token,
    body: JSON.stringify(input)
  });
  return response.listing;
}

export function purchaseListing(
  listingId: string,
  quantity: number,
  phone: string,
  token: string
): Promise<PurchaseResult> {
  return apiRequest<PurchaseResult>(`/api/v1/listings/${listingId}/purchase`, {
    method: "POST",
    token,
    body: JSON.stringify({ quantity, phone })
  });
}

export async function updateListing(
  listingId: string,
  input: UpdateListingInput,
  token: string
): Promise<Listing> {
  const response = await apiRequest<ListingResponse>(`/api/v1/listings/${listingId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input)
  });
  return response.listing;
}

export function updatePurchaseRequestStatus(
  requestId: string,
  status: "contacted" | "cancelled",
  token: string
): Promise<{ requestId: string; status: "contacted" | "cancelled" }> {
  return apiRequest(`/api/v1/listings/requests/${encodeURIComponent(requestId)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status })
  });
}

export function deleteListing(listingId: string, token: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/v1/listings/${listingId}`, {
    method: "DELETE",
    token
  });
}

interface MarketEventSuggestion {
  eventId: string;
  title: string;
  venue: string;
  city: string;
  startAt: string;
  artists: string[];
  imageUrl?: string;
  activeListingCount: number;
  currentPriceCents: number;
}

interface MarketEventsResponse {
  events: MarketEventSuggestion[];
}

export async function listMarketEventSuggestions(input: {
  query?: string;
  artist?: string;
  city?: string;
  limit?: number;
}): Promise<MarketEventSuggestion[]> {
  const params = new URLSearchParams();
  if (input.query?.trim()) {
    params.set("q", input.query.trim());
  }
  if (input.artist?.trim()) {
    params.set("artist", input.artist.trim());
  }
  if (input.city?.trim()) {
    params.set("city", input.city.trim());
  }
  if (input.limit) {
    params.set("limit", String(input.limit));
  }

  const response = await apiRequest<MarketEventsResponse>(
    `/api/v1/listings/market?${params.toString()}`
  );
  return response.events;
}
