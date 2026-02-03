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
        PermissionsBitField.Flags.ManageGuild
      ) ?? false;

    if (!canManage) {
      await interaction.reply({
        content: "You need Manage Server permission to run this.",
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

    const category = await guild.channels.create({
      name: "faction public chats",
      type: ChannelType.GuildCategory,
    });

    await interaction.reply({
      content: `Setting up... Created category: ${category.name}`,
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
