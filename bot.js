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
    this.autocompleteHandlers = new Map();
    this.readyPromise = new Promise((resolve) => {
      this.client.once("clientReady", () => resolve());
    });

    this.client.on("interactionCreate", async (interaction) => {
      if (interaction.isAutocomplete()) {
        const handler = this.autocompleteHandlers.get(
          interaction.commandName.toLowerCase()
        );
        if (handler) {
          await handler(interaction);
        }
        return;
      }
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
      const existing = await this.client.application.commands.fetch();
      const match = existing.find((cmd) => cmd.name === commandName);
      if (match) {
        await this.client.application.commands.edit(match.id, payload);
      } else {
        await this.client.application.commands.create(payload);
      }
    }

    if (scope === "guild" || scope === "both") {
      for (const guild of this.client.guilds.cache.values()) {
        const existing = await guild.commands.fetch();
        const match = existing.find((cmd) => cmd.name === commandName);
        if (match) {
          await guild.commands.edit(match.id, payload);
        } else {
          await guild.commands.create(payload);
        }
      }
    }
  }

  setAutocomplete(commandName, handler) {
    this.autocompleteHandlers.set(commandName.toLowerCase(), handler);
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
