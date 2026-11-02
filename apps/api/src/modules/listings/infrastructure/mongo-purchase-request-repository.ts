import type { Collection } from "mongodb";
import { getMongoDb } from "../../../database/mongo.js";
import type { PurchaseRequest } from "../domain/purchase-request.js";
import type { PurchaseRequestRepository } from "../domain/purchase-request-repository.js";

interface PurchaseRequestDocument {
  _id: string;
  listingId: string;
  eventId: string;
  buyerId: string;
  sellerId: string;
  quantity: number;
  buyerPhone: string;
  unitPriceCents?: number;
  status: PurchaseRequest["status"];
  createdAt: Date;
  updatedAt: Date;
}

export class MongoPurchaseRequestRepository implements PurchaseRequestRepository {
  private collectionPromise: Promise<Collection<PurchaseRequestDocument>> | null = null;

  private async getCollection(): Promise<Collection<PurchaseRequestDocument>> {
    if (!this.collectionPromise) {
      this.collectionPromise = getMongoDb().then((db) =>
        db.collection<PurchaseRequestDocument>("purchase_requests")
      );
    }

    return this.collectionPromise;
  }

  async create(purchaseRequest: PurchaseRequest): Promise<PurchaseRequest> {
    const collection = await this.getCollection();
    await collection.insertOne({
      _id: purchaseRequest.id,
      listingId: purchaseRequest.listingId,
      eventId: purchaseRequest.eventId,
      buyerId: purchaseRequest.buyerId,
      sellerId: purchaseRequest.sellerId,
      quantity: purchaseRequest.quantity,
      buyerPhone: purchaseRequest.buyerPhone,
      unitPriceCents: purchaseRequest.unitPriceCents,
      status: purchaseRequest.status,
      createdAt: purchaseRequest.createdAt,
      updatedAt: purchaseRequest.updatedAt
    });
    return purchaseRequest;
  }

  async listByBuyerId(buyerId: string): Promise<PurchaseRequest[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({ buyerId }).sort({ createdAt: -1 }).toArray();
    return docs.map((doc) => this.fromDocument(doc));
  }

  async listBySellerId(sellerId: string): Promise<PurchaseRequest[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({ sellerId }).sort({ createdAt: -1 }).toArray();
    return docs.map((doc) => this.fromDocument(doc));
  }

  async listByListingId(listingId: string): Promise<PurchaseRequest[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({ listingId }).sort({ createdAt: -1 }).toArray();
    return docs.map((doc) => this.fromDocument(doc));
  }

  async findById(id: string): Promise<PurchaseRequest | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ _id: id });
    return doc ? this.fromDocument(doc) : null;
  }

  async updateStatus(id: string, status: PurchaseRequest["status"]): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne({ _id: id }, { $set: { status, updatedAt: new Date() } });
  }

  private fromDocument(doc: PurchaseRequestDocument): PurchaseRequest {
    return {
      id: doc._id,
      listingId: doc.listingId,
      eventId: doc.eventId,
      buyerId: doc.buyerId,
      sellerId: doc.sellerId,
      quantity: doc.quantity,
      buyerPhone: doc.buyerPhone,
      unitPriceCents: doc.unitPriceCents,
      status: doc.status,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt)
    };
  }
}
