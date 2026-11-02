import type { PurchaseRequest } from "./purchase-request.js";

export interface PurchaseRequestRepository {
  create(purchaseRequest: PurchaseRequest): Promise<PurchaseRequest>;
  listByBuyerId(buyerId: string): Promise<PurchaseRequest[]>;
  listBySellerId(sellerId: string): Promise<PurchaseRequest[]>;
  listByListingId(listingId: string): Promise<PurchaseRequest[]>;
  findById(id: string): Promise<PurchaseRequest | null>;
  updateStatus(id: string, status: PurchaseRequest["status"]): Promise<void>;
}
