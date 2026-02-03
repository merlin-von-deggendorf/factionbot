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
    this.commands = new Map();
    this.readyPromise = new Promise((resolve) => {
      this.client.once("clientReady", () => resolve());
    });

    this.client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const handler = this.commands.get(interaction.commandName);
      if (!handler) return;
      await handler(interaction);
    });
  }

  async connect() {
    await this.client.login(this.token);
    await this.readyPromise;
  }

  async createSlashCommand(name, behaviour, description = "Command") {
    this.commands.set(name, behaviour);
    await this.readyPromise;
    await this.client.application.commands.create({
      name,
      description,
    });
  }

  getClient() {
    return this.client;
  }
}

const botClient = new BotClient();
export default botClient;
