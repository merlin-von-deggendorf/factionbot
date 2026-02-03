import { Client, GatewayIntentBits } from "discord.js";

class BotClient {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
    this.token = process.env.DISCORD_TOKEN;
  }

  async connect() {
    if (!this.token) {
      console.error("Missing DISCORD_TOKEN in environment.");
      process.exit(1);
    }
    await this.client.login(this.token);
    return this.client;
  }

  getClient() {
    return this.client;
  }
}

const botClient = new BotClient();

export default botClient;
