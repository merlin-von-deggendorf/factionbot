import "dotenv/config";
import dbClient from "./db.js";
import botClient from "./bot.js";

const client = botClient.getClient();

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content.toLowerCase() === "hello") {
    message.channel.send("Hello worlds!");
  }
});

await botClient.connect();
