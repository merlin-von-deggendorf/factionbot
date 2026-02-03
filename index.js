import "dotenv/config";
import botClient from "./bot.js";
import dbClient from "./db.js";

await dbClient.connect();
await botClient.connect();

const client = botClient.getClient();
const db = dbClient.getDb();

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content.toLowerCase() === "hello") {
    message.channel.send("Hello world!");
  }
});
