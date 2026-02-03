import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { startBot } from "./bot.js";
import { connectDb } from "./db.js";
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const db = await connectDb();
await startBot(client, db);
