export type PurchaseRequestStatus = "pending" | "contacted" | "cancelled";

export interface PurchaseRequest {
  id: string;
  listingId: string;
  eventId: string;
  buyerId: string;
  sellerId: string;
  quantity: number;
  buyerPhone: string;
  /** Price per ticket quoted when the request was sent (older requests may not have it). */
  unitPriceCents?: number;
  status: PurchaseRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}
