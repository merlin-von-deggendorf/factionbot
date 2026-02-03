import "dotenv/config";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ApplicationCommandOptionType,
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
    if (factionName.includes("|")) {
      await interaction.reply({
        content: "Faction name cannot include the '|' character.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guild = interaction.guild;
    if (guild) {
      const channels = await guild.channels.fetch();
      const prefix = `${factionName}|`.toLowerCase();
      const existing = channels.find(
        (channel) =>
          channel &&
          channel.parent &&
          ["public chat", "public voice", "private chat", "private voice"].includes(
            channel.parent.name.toLowerCase()
          ) &&
          channel.name.toLowerCase().startsWith(prefix)
      );

      if (existing) {
        await interaction.reply({
          content: "A faction channel with that name already exists.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const roles = await guild.roles.fetch();
      const factionNameLower = factionName.toLowerCase();
      const leaderRoleName = `${factionName} | leader`.toLowerCase();
      const roleExists = roles.some((role) => {
        const roleName = role.name.toLowerCase();
        return roleName === factionNameLower || roleName === leaderRoleName;
      });

      if (roleExists) {
        await interaction.reply({
          content: "A role with that faction name already exists.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }
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

    const categoryNames = [
      "faction public chat",
      "faction public voice",
      "faction private chat",
      "faction private voice",
    ];

    const created = await botClient.ensureCategories(guild, categoryNames);

    await interaction.reply({
      content:
        created.length > 0
          ? `Setup complete. Created categories: ${created
              .map((c) => c.name)
              .join(", ")}`
          : "Setup complete. All categories already exist.",
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
