import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB ?? "factionbot";
if (!mongoUri) {
  console.error("Missing MONGODB_URI in environment.");
  process.exit(1);
}

const mongo = new MongoClient(mongoUri, {
  serverSelectionTimeoutMS: 5000,
});

async function connectMongo() {
  await mongo.connect();
  const db = mongo.db(mongoDbName);
  await db.command({ ping: 1 });
  console.log(`MongoDB connected: ${db.databaseName}`);
  return db;
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("Missing DISCORD_TOKEN in environment.");
  process.exit(1);
}
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content.toLowerCase() === "hello") {
    message.channel.send("Hello world!");
  }
});

const db = await connectMongo();
client.db = db;

await client.login(token);

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
