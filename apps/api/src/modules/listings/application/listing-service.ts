import crypto from "node:crypto";
import { env } from "../../../config/env.js";
import { HttpError } from "../../../shared/http-error.js";
import { EventService } from "../../events/application/event-service.js";
import type { EmailSender } from "../../auth/domain/email-sender.js";
import type { UserRepository } from "../../auth/domain/user-repository.js";
import type { Listing } from "../domain/listing.js";
import type { ListingRepository } from "../domain/listing-repository.js";
import type { PurchaseRepository } from "../domain/purchase-repository.js";
import type { PurchaseRequestRepository } from "../domain/purchase-request-repository.js";

export interface CreateListingInput {
  eventId?: string;
  eventTitle?: string;
  eventArtist?: string;
  eventVenue?: string;
  eventCity: string;
  eventStartAt?: string;
  eventImageUrl?: string;
  sellerId: string;
  title?: string;
  seatType: "GA" | "VIP" | "OTHER";
  priceCents: number;
  quantity: number;
  notes?: string;
}

export interface ListingResponse {
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

export interface PurchaseResult {
  requestId: string;
  listingId: string;
  requestedQuantity: number;
  buyerPhone: string;
  status: "pending" | "contacted" | "cancelled";
  message: string;
}

export interface UpdateListingInput {
  listingId: string;
  title?: string;
  seatType?: "GA" | "VIP" | "OTHER";
  priceCents?: number;
  quantity?: number;
  notes?: string;
}

export class ListingService {
  constructor(
    private readonly listingRepository: ListingRepository,
    private readonly eventService: EventService,
    private readonly purchaseRepository: PurchaseRepository,
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly userRepository?: UserRepository,
    private readonly emailSender?: EmailSender
  ) {}

  async createListing(input: CreateListingInput): Promise<ListingResponse> {
    let event = input.eventId
      ? await this.eventService.getEventById(input.eventId)
      : await this.eventService.findOrCreateEventForListing({
          title: input.eventTitle ?? "",
          artist: input.eventArtist,
          venue: input.eventVenue ?? "",
          city: input.eventCity,
          startAt: input.eventStartAt,
          sellerId: input.sellerId,
          imageUrl: input.eventImageUrl
        });

    const eventImageUrl = input.eventImageUrl?.trim();
    if (eventImageUrl && event.imageUrl !== eventImageUrl) {
      event = await this.eventService.updateEvent({
        eventId: event.id,
        imageUrl: eventImageUrl
      });
    }

    const now = new Date();
    const listing: Listing = {
      id: crypto.randomUUID(),
      eventId: event.id,
      sellerId: input.sellerId,
      title:
        input.title?.trim() ||
        `${event.title} - ${input.seatType} ticket${input.quantity > 1 ? "s" : ""}`,
      seatType: input.seatType,
      priceCents: input.priceCents,
      quantity: input.quantity,
      notes: input.notes?.trim() || undefined,
      soldOut: false,
      createdAt: now,
      updatedAt: now
    };

    const created = await this.listingRepository.create(listing);
    return this.toResponse(created, event);
  }

  async listListings(filters: {
    eventId?: string;
    sellerId?: string;
    includeSoldOut?: boolean;
  }): Promise<ListingResponse[]> {
    const listings = await this.listingRepository.list();
    const filtered = listings
      .filter((listing) => (filters.eventId ? listing.eventId === filters.eventId : true))
      .filter((listing) => (filters.sellerId ? listing.sellerId === filters.sellerId : true))
      .filter((listing) => (filters.includeSoldOut ? true : !listing.soldOut));

    // Load events once instead of one lookup per listing, and skip listings whose event
    // no longer exists so one orphaned row can't break every page that lists tickets.
    const events = await this.eventService.listEvents({ upcomingOnly: false });
    const eventsById = new Map(events.map((event) => [event.id, event]));
    const responses: ListingResponse[] = [];
    for (const listing of filtered) {
      const event = eventsById.get(listing.eventId);
      if (!event) {
        console.warn(`[listings] skipping listing ${listing.id}: event ${listing.eventId} not found`);
        continue;
      }
      responses.push(await this.toResponse(listing, event));
    }
    return responses;
  }

  async getListingById(listingId: string): Promise<ListingResponse> {
    const listing = await this.listingRepository.findById(listingId);
    if (!listing) {
      throw new HttpError(404, "Listing not found.");
    }

    return this.toResponse(listing);
  }

  async updateListing(input: UpdateListingInput): Promise<ListingResponse> {
    const listing = await this.listingRepository.findById(input.listingId);
    if (!listing) {
      throw new HttpError(404, "Listing not found.");
    }

    const nextPriceCents = input.priceCents ?? listing.priceCents;
    if (!Number.isInteger(nextPriceCents) || nextPriceCents < 100) {
      throw new HttpError(400, "Listing price must be at least $1.00.");
    }

    const nextQuantity = input.quantity ?? listing.quantity;
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1 || nextQuantity > 20) {
      throw new HttpError(400, "Listing quantity must be between 1 and 20.");
    }

    const updated: Listing = {
      ...listing,
      title: input.title?.trim() || listing.title,
      seatType: input.seatType ?? listing.seatType,
      priceCents: nextPriceCents,
      quantity: nextQuantity,
      notes: input.notes !== undefined ? input.notes.trim() || undefined : listing.notes,
      soldOut: nextQuantity <= 0 ? true : listing.soldOut,
      updatedAt: new Date()
    };

    const saved = await this.listingRepository.update(updated);
    return this.toResponse(saved);
  }

  async deleteListing(listingId: string): Promise<void> {
    const listing = await this.listingRepository.findById(listingId);
    if (!listing) {
      throw new HttpError(404, "Listing not found.");
    }
    await this.listingRepository.delete(listingId);
  }

  async purchaseListing(input: {
    listingId: string;
    buyerId: string;
    quantity: number;
    buyerPhone: string;
  }): Promise<PurchaseResult> {
    const listing = await this.listingRepository.findById(input.listingId);
    if (!listing) {
      throw new HttpError(404, "Listing not found.");
    }

    if (listing.sellerId === input.buyerId && env.NODE_ENV !== "development") {
      throw new HttpError(400, "You cannot buy your own listing.");
    }

    if (listing.soldOut || listing.quantity < input.quantity) {
      throw new HttpError(400, "Not enough tickets available.");
    }

    const requestId = crypto.randomUUID();
    const trimmedPhone = input.buyerPhone.trim();
    await this.purchaseRequestRepository.create({
      id: requestId,
      listingId: listing.id,
      eventId: listing.eventId,
      buyerId: input.buyerId,
      sellerId: listing.sellerId,
      quantity: input.quantity,
      buyerPhone: trimmedPhone,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.notifySellerOfPurchaseRequest({
      listing,
      buyerId: input.buyerId,
      quantity: input.quantity,
      buyerPhone: trimmedPhone
    });

    return {
      requestId,
      listingId: listing.id,
      requestedQuantity: input.quantity,
      buyerPhone: trimmedPhone,
      status: "pending",
      message: "Request sent. Seller will reach out to your phone shortly."
    };
  }

  private async notifySellerOfPurchaseRequest(input: {
    listing: Listing;
    buyerId: string;
    quantity: number;
    buyerPhone: string;
  }): Promise<void> {
    if (!this.emailSender || !this.userRepository) {
      return;
    }
    try {
      const [seller, buyer, event] = await Promise.all([
        this.userRepository.findById(input.listing.sellerId),
        this.userRepository.findById(input.buyerId),
        this.eventService.getEventById(input.listing.eventId)
      ]);
      if (!seller) {
        console.warn(
          `[email] skipping purchase request email: seller ${input.listing.sellerId} not found`
        );
        return;
      }
      const totalPriceCents = input.listing.priceCents * input.quantity;
      const listingUrl = `${env.APP_WEB_URL.replace(/\/+$/, "")}/listings/${input.listing.id}`;
      await this.emailSender.sendPurchaseRequestEmail({
        sellerEmail: seller.email,
        sellerName: seller.displayName,
        buyerName: buyer?.displayName ?? "A Miami Tix buyer",
        buyerEmail: buyer?.email ?? "unknown@miamitix.com",
        buyerPhone: input.buyerPhone,
        quantity: input.quantity,
        pricePerTicketCents: input.listing.priceCents,
        totalPriceCents,
        listingTitle: input.listing.title,
        seatType: input.listing.seatType,
        eventTitle: event.title,
        eventCity: event.city,
        eventVenue:
          event.venue && event.venue.trim() && event.venue.trim() !== "TBD"
            ? event.venue
            : undefined,
        eventStartAt: event.startAt,
        listingUrl
      });
    } catch (error) {
      console.error("[email] purchase request notification failed:", error);
    }
  }

  private async toResponse(listing: Listing, eventInput?: Awaited<ReturnType<EventService["getEventById"]>>): Promise<ListingResponse> {
    const event = eventInput ?? (await this.eventService.getEventById(listing.eventId));
    return {
      id: listing.id,
      eventId: listing.eventId,
      eventTitle: event.title,
      eventCity: event.city,
      eventStartAt: event.startAt,
      sellerId: listing.sellerId,
      title: listing.title,
      seatType: listing.seatType,
      priceCents: listing.priceCents,
      quantity: listing.quantity,
      notes: listing.notes,
      soldOut: listing.soldOut,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString()
    };
  }

  async listMarketEventSuggestions(input: {
    query?: string;
    artist?: string;
    city?: string;
    limit?: number;
  }): Promise<
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
  > {
    const listings = await this.listListings({});
    const grouped = new Map<
      string,
      {
        event: Awaited<ReturnType<EventService["getEventById"]>>;
        listingCount: number;
        lowestPrice: number;
      }
    >();

    for (const listing of listings) {
      const existing = grouped.get(listing.eventId);
      if (existing) {
        existing.listingCount += 1;
        existing.lowestPrice = Math.min(existing.lowestPrice, listing.priceCents);
        continue;
      }

      const event = await this.eventService.getEventById(listing.eventId);
      if (new Date(event.startAt).getTime() < Date.now()) {
        continue;
      }
      grouped.set(listing.eventId, {
        event,
        listingCount: 1,
        lowestPrice: listing.priceCents
      });
    }

    const normalizedQuery = input.query?.trim().toLowerCase();
    const normalizedArtist = input.artist?.trim().toLowerCase();
    const normalizedCity = input.city?.trim().toLowerCase();
    const limit = Math.max(1, Math.min(input.limit ?? 10, 50));

    return Array.from(grouped.entries())
      .map(([eventId, value]) => ({
        eventId,
        title: value.event.title,
        venue: value.event.venue,
        city: value.event.city,
        startAt: value.event.startAt,
        artists: value.event.artists,
        imageUrl: value.event.imageUrl,
        activeListingCount: value.listingCount,
        currentPriceCents: value.lowestPrice
      }))
      .filter((item) =>
        normalizedQuery
          ? `${item.title} ${item.artists.join(" ")}`.toLowerCase().includes(normalizedQuery)
          : true
      )
      .filter((item) =>
        normalizedArtist
          ? item.artists.some((artist) => artist.toLowerCase().includes(normalizedArtist))
          : true
      )
      .filter((item) => (normalizedCity ? item.city.toLowerCase().includes(normalizedCity) : true))
      .slice(0, limit);
  }

  async listBoughtEvents(buyerId: string): Promise<
    Array<{
      eventId: string;
      eventTitle: string;
      city: string;
      totalSpentCents: number;
      totalTickets: number;
    }>
  > {
    const purchases = await this.purchaseRepository.listByBuyerId(buyerId);
    const grouped = new Map<
      string,
      {
        eventTitle: string;
        city: string;
        totalSpentCents: number;
        totalTickets: number;
      }
    >();

    for (const purchase of purchases) {
      const event = await this.eventService.getEventById(purchase.eventId);
      const existing = grouped.get(purchase.eventId);
      if (existing) {
        existing.totalSpentCents += purchase.totalPriceCents;
        existing.totalTickets += purchase.quantity;
      } else {
        grouped.set(purchase.eventId, {
          eventTitle: event.title,
          city: event.city,
          totalSpentCents: purchase.totalPriceCents,
          totalTickets: purchase.quantity
        });
      }
    }

    return Array.from(grouped.entries()).map(([eventId, value]) => ({
      eventId,
      eventTitle: value.eventTitle,
      city: value.city,
      totalSpentCents: value.totalSpentCents,
      totalTickets: value.totalTickets
    }));
  }

  async listPurchaseRequestsByBuyer(buyerId: string): Promise<
    Array<{
      requestId: string;
      listingId: string;
      eventId: string;
      eventTitle: string;
      city: string;
      quantity: number;
      buyerPhone: string;
      status: "pending" | "contacted" | "cancelled";
      createdAt: string;
    }>
  > {
    const requests = await this.purchaseRequestRepository.listByBuyerId(buyerId);
    return Promise.all(
      requests.map(async (request) => {
        const event = await this.eventService.getEventById(request.eventId);
        return {
          requestId: request.id,
          listingId: request.listingId,
          eventId: request.eventId,
          eventTitle: event.title,
          city: event.city,
          quantity: request.quantity,
          buyerPhone: request.buyerPhone,
          status: request.status,
          createdAt: request.createdAt.toISOString()
        };
      })
    );
  }

  async listPurchaseRequestsBySeller(sellerId: string): Promise<
    Array<{
      requestId: string;
      listingId: string;
      eventId: string;
      eventTitle: string;
      buyerId: string;
      quantity: number;
      buyerPhone: string;
      status: "pending" | "contacted" | "cancelled";
      createdAt: string;
    }>
  > {
    const requests = await this.purchaseRequestRepository.listBySellerId(sellerId);
    return Promise.all(
      requests.map(async (request) => {
        const event = await this.eventService.getEventById(request.eventId);
        return {
          requestId: request.id,
          listingId: request.listingId,
          eventId: request.eventId,
          eventTitle: event.title,
          buyerId: request.buyerId,
          quantity: request.quantity,
          buyerPhone: request.buyerPhone,
          status: request.status,
          createdAt: request.createdAt.toISOString()
        };
      })
    );
  }
}
