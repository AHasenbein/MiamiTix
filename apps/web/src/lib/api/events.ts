import { apiRequest } from "./client";

export interface Event {
  id: string;
  organizerId: string;
  title: string;
  artists: string[];
  venue: string;
  city: string;
  startAt: string;
  imageUrl?: string;
  description?: string;
  isHouseMusic: boolean;
  createdAt: string;
}

interface EventsResponse {
  events: Event[];
}

interface EventResponse {
  event: Event;
}

interface UploadEventImageResponse {
  imageUrl: string;
}

export interface CreateEventInput {
  title: string;
  artists?: string[];
  venue: string;
  city: string;
  startAt: string;
  imageUrl?: string;
  description?: string;
}

export interface UpdateEventInput {
  title?: string;
  artists?: string[];
  venue?: string;
  city?: string;
  startAt?: string;
  imageUrl?: string;
  description?: string;
}

interface ListEventsOptions {
  query?: string;
  city?: string;
  limit?: number;
}

export async function listEvents(options: ListEventsOptions = {}): Promise<Event[]> {
  const query = new URLSearchParams();
  if (options.query?.trim()) {
    query.set("q", options.query.trim());
  }
  if (options.city?.trim()) {
    query.set("city", options.city.trim());
  }
  if (options.limit) {
    query.set("limit", String(options.limit));
  }

  const response = await apiRequest<EventsResponse>(`/api/v1/events?${query.toString()}`);
  return response.events;
}

export async function listArtistSuggestions(query: string, limit = 8): Promise<string[]> {
  const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
  const response = await apiRequest<{ artists: string[] }>(
    `/api/v1/events/artists?${params.toString()}`
  );
  return response.artists ?? [];
}

export async function getEvent(eventId: string): Promise<Event> {
  const response = await apiRequest<EventResponse>(`/api/v1/events/${encodeURIComponent(eventId)}`);
  return response.event;
}

export async function createEvent(input: CreateEventInput, token: string): Promise<Event> {
  const response = await apiRequest<EventResponse>("/api/v1/events", {
    method: "POST",
    token,
    body: JSON.stringify(input)
  });
  return response.event;
}

export async function updateEvent(
  eventId: string,
  input: UpdateEventInput,
  token: string
): Promise<Event> {
  const response = await apiRequest<EventResponse>(`/api/v1/events/${eventId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input)
  });
  return response.event;
}

export async function uploadEventImage(
  imageDataUrl: string,
  token: string
): Promise<string> {
  const response = await apiRequest<UploadEventImageResponse>("/api/v1/events/upload-image", {
    method: "POST",
    token,
    body: JSON.stringify({ imageDataUrl })
  });
  return response.imageUrl;
}

export async function deleteAllEventsLocal(token: string): Promise<{
  message: string;
  deleted: {
    events: number;
    listings: number;
    purchases: number;
    wishlists: number;
  };
}> {
  return apiRequest<{
    message: string;
    deleted: {
      events: number;
      listings: number;
      purchases: number;
      wishlists: number;
    };
  }>("/api/v1/events/admin/all", {
    method: "DELETE",
    token
  });
}
