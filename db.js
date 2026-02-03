import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB ?? "factionbot";
if (!mongoUri) {
  throw new Error("Missing MONGODB_URI in environment.");
}

const mongo = new MongoClient(mongoUri, {
  serverSelectionTimeoutMS: 5000,
});

await mongo.connect();
const db = mongo.db(mongoDbName);
await db.command({ ping: 1 });
console.log(`MongoDB connected: ${db.databaseName}`);

const shutdown = async () => {
  try {
    await mongo.close();
    console.log("MongoDB disconnected.");
  } catch (error) {
    console.error("MongoDB disconnect error:", error);
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export async function storeMessage(message) {
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

  return db.collection("messages").insertOne(doc);
}

export default db;
