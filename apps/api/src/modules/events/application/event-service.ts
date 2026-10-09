import crypto from "node:crypto";
import { HttpError } from "../../../shared/http-error.js";
import type { Event } from "../domain/event.js";
import type { EventRepository } from "../domain/event-repository.js";

export interface CreateEventInput {
  organizerId: string;
  title: string;
  artists?: string[];
  venue: string;
  city: string;
  startAt: string;
  imageUrl?: string;
  description?: string;
}

export interface UpdateEventInput {
  eventId: string;
  title?: string;
  artists?: string[];
  venue?: string;
  city?: string;
  startAt?: string;
  imageUrl?: string;
  description?: string;
}

export interface EventResponse {
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

interface ListEventsInput {
  upcomingOnly?: boolean;
  query?: string;
  city?: string;
  limit?: number;
  ids?: string[];
}

export class EventService {
  constructor(private readonly eventRepository: EventRepository) {}

  async createEvent(input: CreateEventInput): Promise<EventResponse> {
    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new HttpError(400, "Event start date is invalid.");
    }

    const created = await this.eventRepository.create({
      id: crypto.randomUUID(),
      organizerId: input.organizerId,
      title: input.title.trim(),
      artists: this.normalizeArtists(input.artists),
      venue: input.venue.trim(),
      city: input.city.trim(),
      startAt,
      imageUrl: this.normalizeImageUrl(input.imageUrl),
      description: input.description?.trim() || undefined,
      createdAt: new Date()
    });

    return this.toResponse(created);
  }

  async listEvents(input: ListEventsInput = {}): Promise<EventResponse[]> {
    const events = await this.eventRepository.list();
    const now = Date.now();
    const normalizedQuery = input.query?.trim().toLowerCase();
    const normalizedCity = input.city?.trim().toLowerCase();
    const filtered = events
      .filter((event) => (input.upcomingOnly ?? true ? event.startAt.getTime() >= now : true))
      .filter((event) => (input.ids?.length ? input.ids.includes(event.id) : true))
      .filter((event) =>
        normalizedQuery
          ? `${event.title} ${event.venue} ${event.city} ${event.description ?? ""} ${event.artists.join(" ")}`.toLowerCase().includes(normalizedQuery)
          : true
      )
      .filter((event) =>
        normalizedCity ? event.city.toLowerCase().includes(normalizedCity) : true
      );

    const limited = input.limit && input.limit > 0 ? filtered.slice(0, input.limit) : filtered;
    return limited.map((event) => this.toResponse(event));
  }

  async getEventById(eventId: string): Promise<EventResponse> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new HttpError(404, "Event not found.");
    }

    return this.toResponse(event);
  }

  async updateEvent(input: UpdateEventInput): Promise<EventResponse> {
    const event = await this.eventRepository.findById(input.eventId);
    if (!event) {
      throw new HttpError(404, "Event not found.");
    }

    const nextStartAt = input.startAt ? new Date(input.startAt) : event.startAt;
    if (Number.isNaN(nextStartAt.getTime())) {
      throw new HttpError(400, "Event start date is invalid.");
    }

    const updated: Event = {
      ...event,
      title: input.title?.trim() || event.title,
      artists: input.artists ? this.normalizeArtists(input.artists) : event.artists,
      venue: input.venue?.trim() ?? event.venue,
      city: input.city?.trim() || event.city,
      startAt: nextStartAt,
      imageUrl: input.imageUrl !== undefined ? this.normalizeImageUrl(input.imageUrl) : event.imageUrl,
      description:
        input.description !== undefined
          ? input.description.trim() || undefined
          : event.description
    };

    const saved = await this.eventRepository.update(updated);
    return this.toResponse(saved);
  }

  async listArtistSuggestions(input: { query?: string; limit?: number } = {}): Promise<string[]> {
    const events = await this.eventRepository.list();
    const normalizedQuery = input.query?.trim().toLowerCase();
    const merged = new Set(
      events.flatMap((event) => event.artists.map((artist) => artist.trim()).filter(Boolean))
    );
    let suggestions = Array.from(merged);
    if (normalizedQuery) {
      suggestions = suggestions.filter((artist) =>
        artist.toLowerCase().includes(normalizedQuery)
      );
    }
    return suggestions.slice(0, Math.max(1, Math.min(input.limit ?? 20, 500)));
  }

  private toResponse(event: Event): EventResponse {
    return {
      id: event.id,
      organizerId: event.organizerId,
      title: event.title,
      artists: event.artists,
      venue: event.venue,
      city: event.city,
      startAt: event.startAt.toISOString(),
      imageUrl: event.imageUrl,
      description: event.description,
      isHouseMusic: false,
      createdAt: event.createdAt.toISOString()
    };
  }

  async findOrCreateEventForListing(input: {
    title: string;
    artist?: string;
    venue: string;
    city: string;
    startAt?: string;
    sellerId: string;
    imageUrl?: string;
  }): Promise<EventResponse> {
    const normalizedTitle = input.title.trim();
    if (!normalizedTitle) {
      throw new HttpError(400, "Event title is required.");
    }

    const allEvents = await this.eventRepository.list();
    // Only reuse upcoming events: a recurring night (same title + city) must not attach new
    // listings to last week's past event, which is hidden from browse.
    const now = Date.now();
    const existing = allEvents.find(
      (event) =>
        event.startAt.getTime() >= now &&
        event.title.toLowerCase() === normalizedTitle.toLowerCase() &&
        event.city.toLowerCase() === input.city.trim().toLowerCase()
    );
    if (existing) {
      return this.toResponse(existing);
    }

    const parsedStartAt = input.startAt ? new Date(input.startAt) : null;
    if (parsedStartAt && Number.isNaN(parsedStartAt.getTime())) {
      throw new HttpError(400, "Event date/time is invalid.");
    }

    const created = await this.eventRepository.create({
      id: crypto.randomUUID(),
      organizerId: input.sellerId,
      title: normalizedTitle,
      artists: this.normalizeArtists(input.artist ? [input.artist] : []),
      venue: input.venue.trim(),
      city: input.city.trim(),
      startAt: parsedStartAt ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      imageUrl: this.normalizeImageUrl(input.imageUrl),
      description: undefined,
      createdAt: new Date()
    });
    return this.toResponse(created);
  }

  private normalizeArtists(input?: string[]): string[] {
    const values = input ?? [];
    const unique = new Set<string>();

    for (const value of values) {
      const normalized = value.trim();
      if (!normalized) {
        continue;
      }
      unique.add(normalized);
    }

    return Array.from(unique).slice(0, 8);
  }

  private normalizeImageUrl(input?: string): string | undefined {
    const normalized = input?.trim();
    if (!normalized) {
      return undefined;
    }
    const isRemoteHttp = /^https?:\/\//i.test(normalized);
    const isDataImage = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(normalized);
    if (!isRemoteHttp && !isDataImage) {
      throw new HttpError(400, "Event image must be a valid image URL or image upload.");
    }
    return normalized;
  }
}
