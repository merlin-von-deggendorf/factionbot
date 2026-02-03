import { ChannelType, Client, GatewayIntentBits } from "discord.js";

class BotClient {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
      ],
    });
    this.token = process.env.DISCORD_TOKEN;
    this.commands = new Map();
    this.autocompleteHandlers = new Map();
    this.commandDefinitions = new Map();
    this.readyPromise = new Promise((resolve) => {
      this.client.once("clientReady", () => resolve());
    });

    this.client.on("interactionCreate", async (interaction) => {
      try {
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
      } catch (error) {
        console.error("Interaction handler error:", error);
        if (interaction.isRepliable()) {
          const detail =
            error instanceof Error ? error.message : "Unknown error";
          try {
            if (interaction.deferred || interaction.replied) {
              await interaction.editReply({
                content: `Something went wrong: ${detail}`,
              });
            } else {
              await interaction.reply({
                content: `Something went wrong: ${detail}`,
                flags: 64,
              });
            }
          } catch (replyError) {
            console.error("Failed to send error reply:", replyError);
          }
        }
      }
    });

    this.client.on("error", (error) => {
      console.error("Discord client error:", error);
    });

    this.client.on("shardError", (error) => {
      console.error("Discord shard error:", error);
    });

    this.client.on("rateLimit", (info) => {
      console.warn("Rate limited:", info);
    });

    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled rejection:", reason);
    });

    process.on("uncaughtException", (error) => {
      console.error("Uncaught exception:", error);
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
    this.commandDefinitions.set(commandName, {
      name: commandName,
      description,
      options,
      scope,
    });
  }

  setAutocomplete(commandName, handler) {
    this.autocompleteHandlers.set(commandName.toLowerCase(), handler);
  }

  async syncCommands() {
    await this.readyPromise;

    const globals = [];
    const guilds = [];
    const globalNames = new Set();
    const guildNames = new Set();

    for (const def of this.commandDefinitions.values()) {
      if (def.scope === "global" || def.scope === "both") {
        globals.push(def);
        globalNames.add(def.name);
      }
      if (def.scope === "guild" || def.scope === "both") {
        guilds.push(def);
        guildNames.add(def.name);
      }
    }

    if (globals.length > 0) {
      const existing = await this.client.application.commands.fetch();
      for (const cmd of existing.values()) {
        if (!globalNames.has(cmd.name)) {
          await this.client.application.commands.delete(cmd.id);
        }
      }
      for (const def of globals) {
        const payload = {
          name: def.name,
          description: def.description,
          options: def.options,
        };
        const match = existing.find((cmd) => cmd.name === def.name);
        if (match) {
          await this.client.application.commands.edit(match.id, payload);
        } else {
          await this.client.application.commands.create(payload);
        }
      }
    }

    if (guilds.length > 0) {
      for (const guild of this.client.guilds.cache.values()) {
        const existing = await guild.commands.fetch();
        for (const cmd of existing.values()) {
          if (!guildNames.has(cmd.name)) {
            await guild.commands.delete(cmd.id);
          }
        }
        for (const def of guilds) {
          const payload = {
            name: def.name,
            description: def.description,
            options: def.options,
          };
          const match = existing.find((cmd) => cmd.name === def.name);
          if (match) {
            await guild.commands.edit(match.id, payload);
          } else {
            await guild.commands.create(payload);
          }
        }
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
