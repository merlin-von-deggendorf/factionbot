import { ChannelType, Client, GatewayIntentBits } from "discord.js";

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

  async createSlashCommand(
    name,
    behaviour,
    description = "Command",
    scope = "guild",
    options = []
  ) {
    const commandName = name.toLowerCase();
    this.commands.set(commandName, behaviour);
    await this.readyPromise;

    const payload = { name: commandName, description, options };

    if (scope === "global" || scope === "both") {
      await this.client.application.commands.create(payload);
    }

    if (scope === "guild" || scope === "both") {
      for (const guild of this.client.guilds.cache.values()) {
        await guild.commands.create(payload);
      }
    }
  }

  async ensureCategories(guild, categoryNames) {
    const channels = await guild.channels.fetch();
    const created = [];

    for (const name of categoryNames) {
      const normalizedName = name.toLowerCase();
      let category = channels.find(
        (channel) =>
          channel?.type === ChannelType.GuildCategory &&
          channel.name.toLowerCase() === normalizedName
      );

      if (!category) {
        category = await guild.channels.create({
          name,
          type: ChannelType.GuildCategory,
        });
        created.push(category);
      }
    }

    return created;
  }

  getClient() {
    return this.client;
  }
}

const botClient = new BotClient();
export default botClient;
