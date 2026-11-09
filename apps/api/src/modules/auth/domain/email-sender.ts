export interface VerificationEmailResult {
  previewUrl?: string;
}

export interface PurchaseRequestEmailParams {
  sellerEmail: string;
  sellerName: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  quantity: number;
  pricePerTicketCents: number;
  totalPriceCents: number;
  listingTitle: string;
  seatType: "GA" | "VIP" | "OTHER";
  eventTitle: string;
  eventCity: string;
  eventVenue?: string;
  eventStartAt: string;
  listingUrl?: string;
}

export interface SellerApplicationEmailParams {
  /** Where applications go. Server-side only; never sent to the browser. */
  to: string;
  name: string;
  email: string;
  description: string;
}

export interface EmailSender {
  sendVerificationEmail(email: string, verificationUrl: string): Promise<VerificationEmailResult>;
  sendPurchaseRequestEmail(params: PurchaseRequestEmailParams): Promise<void>;
  sendSellerApplicationEmail(params: SellerApplicationEmailParams): Promise<void>;
}
