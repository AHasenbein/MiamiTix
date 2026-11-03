export interface FeaturedEventSelection {
  eventId: string;
  selectedBy: string;
  selectedAt: Date;
}

/** Stores the admin-picked "Event of the Month". There is at most one at a time. */
export interface FeaturedEventRepository {
  get(): Promise<FeaturedEventSelection | null>;
  set(selection: FeaturedEventSelection): Promise<void>;
  clear(): Promise<void>;
}
