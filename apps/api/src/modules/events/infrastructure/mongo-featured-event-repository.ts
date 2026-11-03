import type { Collection } from "mongodb";
import { getMongoDb } from "../../../database/mongo.js";
import type {
  FeaturedEventRepository,
  FeaturedEventSelection
} from "../domain/featured-event-repository.js";

const SETTING_ID = "event_of_the_month";

interface SiteSettingDocument extends FeaturedEventSelection {
  _id: string;
}

export class MongoFeaturedEventRepository implements FeaturedEventRepository {
  private collectionPromise: Promise<Collection<SiteSettingDocument>> | null = null;

  private async getCollection(): Promise<Collection<SiteSettingDocument>> {
    if (!this.collectionPromise) {
      this.collectionPromise = getMongoDb().then((db) =>
        db.collection<SiteSettingDocument>("site_settings")
      );
    }
    return this.collectionPromise;
  }

  async get(): Promise<FeaturedEventSelection | null> {
    const collection = await this.getCollection();
    const document = await collection.findOne({ _id: SETTING_ID });
    if (!document) {
      return null;
    }
    return {
      eventId: document.eventId,
      selectedBy: document.selectedBy,
      selectedAt: document.selectedAt
    };
  }

  async set(selection: FeaturedEventSelection): Promise<void> {
    const collection = await this.getCollection();
    await collection.updateOne(
      { _id: SETTING_ID },
      { $set: { ...selection, _id: SETTING_ID } },
      { upsert: true }
    );
  }

  async clear(): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteOne({ _id: SETTING_ID });
  }
}
