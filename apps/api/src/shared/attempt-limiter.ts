import { HttpError } from "./http-error.js";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Soft, in-memory attempt limiter (fixed window per key). It is per API instance and resets on
 * restart, which is enough to slow down password guessing and email spam without extra infra.
 */
export class AttemptLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number
  ) {}

  /** Throws 429 if `key` has used up its attempts in the current window. */
  assertAllowed(key: string, message: string): void {
    const bucket = this.getActiveBucket(key);
    if (bucket && bucket.count >= this.maxAttempts) {
      const minutes = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 60_000));
      throw new HttpError(
        429,
        `${message} Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
      );
    }
  }

  record(key: string): void {
    const bucket = this.getActiveBucket(key);
    if (bucket) {
      bucket.count += 1;
      return;
    }
    this.buckets.set(key, { count: 1, resetAt: Date.now() + this.windowMs });
    this.pruneIfLarge();
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  private getActiveBucket(key: string): Bucket | undefined {
    const bucket = this.buckets.get(key);
    if (bucket && bucket.resetAt <= Date.now()) {
      this.buckets.delete(key);
      return undefined;
    }
    return bucket;
  }

  private pruneIfLarge(): void {
    if (this.buckets.size < 10_000) {
      return;
    }
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}

/** Client IP: Fly's edge sets Fly-Client-IP; fall back to the socket address locally. */
export function clientIp(req: { get(name: string): string | undefined; ip?: string }): string {
  return req.get("fly-client-ip") || req.ip || "unknown";
}
