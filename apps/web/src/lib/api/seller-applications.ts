import { apiRequest } from "./client";

export interface SellerApplicationInput {
  name: string;
  email: string;
  description: string;
  /** Honeypot. Always empty for real people. */
  website?: string;
}

export async function submitSellerApplication(input: SellerApplicationInput): Promise<void> {
  await apiRequest<{ ok: true }>("/api/v1/seller-applications", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
