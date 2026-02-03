import { closeDb } from "./db.js";

function registerBotHandlers(client) {
  client.once("clientReady", () => {
    console.log(`Logged in as ${client.user.tag}`);
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.content.toLowerCase() === "hello") {
      message.channel.send("Hello world!");
    }
  });
}

export async function startBot(client, db) {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error("Missing DISCORD_TOKEN in environment.");
    process.exit(1);
  }

  client.db = db;
  registerBotHandlers(client);

  await client.login(token);

  const shutdown = async () => {
    try {
      await closeDb();
    } catch (error) {
      console.error("MongoDB disconnect error:", error);
    } finally {
      client.destroy();
      process.exit(0);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
