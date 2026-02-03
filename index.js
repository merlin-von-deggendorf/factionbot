import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
const token = process.env.DISCORD_TOKEN;
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

client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (message.content.toLowerCase() === "hello") {
    message.channel.send("Hello world!");
  }
});

client.login(token);
