import { MongoClient } from "mongodb";

class DbClient {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI;
    this.mongoDbName = process.env.MONGODB_DB ?? "factionbot";
    if (!this.mongoUri) {
      console.error("Missing MONGODB_URI in environment.");
      process.exit(1);
    }

    this.mongo = new MongoClient(this.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    this.db = null;
  }

  async connect() {
    await this.mongo.connect();
    this.db = this.mongo.db(this.mongoDbName);
    await this.db.command({ ping: 1 });
    console.log(`MongoDB connected: ${this.db.databaseName}`);
    return this.db;
  }

  getDb() {
    return this.db;
  }

  async storeMessage(message) {
    const doc = {
      messageId: message?.id ?? message?.messageId ?? null,
      content: message?.content ?? message?.text ?? "",
      authorId: message?.author?.id ?? message?.authorId ?? null,
      authorTag: message?.author?.tag ?? message?.authorTag ?? null,
      guildId: message?.guild?.id ?? message?.guildId ?? null,
      channelId: message?.channel?.id ?? message?.channelId ?? null,
      createdAt: message?.createdTimestamp
        ? new Date(message.createdTimestamp)
        : message?.createdAt
          ? new Date(message.createdAt)
          : new Date(),
    };

    return this.db.collection("messages").insertOne(doc);
  }
}

const dbClient = new DbClient();
await dbClient.connect();
export default dbClient;
