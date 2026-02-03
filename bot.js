import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("Missing DISCORD_TOKEN in environment.");
  process.exit(1);
}

queueMicrotask(async () => {
  try {
    await client.login(token);
  } catch (error) {
    console.error("Discord login error:", error);
    process.exit(1);
  }
});

export default client;
