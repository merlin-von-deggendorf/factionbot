import "dotenv/config";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ApplicationCommandOptionType,
  ChannelType,
  PermissionsBitField,
} from "discord.js";
import dbClient from "./db.js";
import botClient from "./bot.js";

const client = botClient.getClient();

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content.toLowerCase() === "hello") {
    message.channel.send("Hello worldsssss!");
  }
});

await botClient.connect();

await botClient.createSlashCommand(
  "createfaction",
  async (interaction) => {
    const factionName = interaction.options.getString("name", true);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("createFaction_ok")
        .setLabel("ok")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: `Create faction: ${factionName}`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
  "Create a faction",
  "guild",
  [
    {
      name: "name",
      description: "Faction name",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ]
);

await botClient.createSlashCommand(
  "setup",
  async (interaction) => {
    const canManage =
      interaction.memberPermissions?.has(
        PermissionsBitField.Flags.Administrator
      ) ?? false;

    if (!canManage) {
      await interaction.reply({
        content: "You need Administrator permission to run this.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: "This command must be run in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channels = await guild.channels.fetch();
    const existingCategory = channels.find(
      (channel) =>
        channel?.type === ChannelType.GuildCategory &&
        channel.name.toLowerCase() === "faction public chats"
    );

    let category = existingCategory;
    if (!category) {
      category = await guild.channels.create({
        name: "faction public chats",
        type: ChannelType.GuildCategory,
      });
    }

    const channelSpecs = [
      { name: "factions private chat", type: ChannelType.GuildText },
      { name: "factions public voice", type: ChannelType.GuildVoice },
      { name: "factions private voice", type: ChannelType.GuildVoice },
    ];

    for (const spec of channelSpecs) {
      const existing = channels.find(
        (channel) =>
          channel?.type === spec.type &&
          channel.name.toLowerCase() === spec.name
      );
      if (!existing) {
        await guild.channels.create({
          name: spec.name,
          type: spec.type,
          parent: category.id,
        });
      }
    }

    await interaction.reply({
      content: `Setup complete. Category: ${category.name}`,
      flags: MessageFlags.Ephemeral,
    });
  },
  "Setup the bot"
);

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton() && interaction.customId === "createFaction_ok") {
    const prefix = "Create faction: ";
    const content = interaction.message?.content ?? "";
    const factionName = content.startsWith(prefix)
      ? content.slice(prefix.length)
      : "Faction";
    await interaction.reply({
      content: `Faction created: ${factionName}`,
      flags: MessageFlags.Ephemeral,
    });
  }
});
