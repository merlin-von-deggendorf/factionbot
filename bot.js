import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { closeDb, connectDb } from "./db.js";

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

const db = await connectDb();
client.db = db;

await client.login(token);

const shutdown = async () => {
  try {
    await closeDb();
  } catch (error) {
    console.error("MongoDB disconnect error:", error);
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
