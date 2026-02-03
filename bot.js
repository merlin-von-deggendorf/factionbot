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
    await this.client.login(this.token);
  }

  getClient() {
    return this.client;
  }
}

const botClient = new BotClient();
export default botClient;
