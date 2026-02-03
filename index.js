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
      const prefix = `${factionName} |`.toLowerCase();
      const categoryNames = [
        "public chat",
        "public voice",
        "private chat",
        "private voice",
      ];

      const existing = channels.find(
        (channel) =>
          channel &&
          channel.parent &&
          categoryNames.includes(channel.parent.name.toLowerCase()) &&
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
      const requestRoleName = `${factionName} | request`.toLowerCase();
      const roleExists = roles.some((role) => {
        const roleName = role.name.toLowerCase();
        return (
          roleName === factionNameLower ||
          roleName === leaderRoleName ||
          roleName === requestRoleName
        );
      });

      if (roleExists) {
        await interaction.reply({
          content: "A role with that faction name already exists.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const categories = categoryNames.reduce((acc, name) => {
        const category = channels.find(
          (channel) =>
            channel?.type === ChannelType.GuildCategory &&
            channel.name.toLowerCase() === name
        );
        acc[name] = category ?? null;
        return acc;
      }, {});

      if (Object.values(categories).some((category) => !category)) {
        await interaction.reply({
          content: "Setup is missing required categories. Run /setup first.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await guild.roles.create({ name: factionName });
      await guild.roles.create({ name: `${factionName} | leader` });
      await guild.roles.create({ name: `${factionName} | request` });

      const channelName = `${factionName} | 0`;

      await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categories["public chat"].id,
      });

      await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categories["private chat"].id,
      });

      await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: categories["public voice"].id,
      });

      await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: categories["private voice"].id,
      });
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
      "public chat",
      "public voice",
      "private chat",
      "private voice",
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

await botClient.createSlashCommand(
  "addleader",
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

    const factionName = interaction.options.getString("faction", true);
    const member =
      interaction.options.getMember("member") ??
      (await interaction.guild?.members.fetch(
        interaction.options.getUser("member", true).id
      ));

    if (!interaction.guild || !member) {
      await interaction.reply({
        content: "Member not found.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const roles = await interaction.guild.roles.fetch();
    const targetRoleName = `${factionName} | leader`.toLowerCase();
    const role = roles.find(
      (r) => r.name.toLowerCase() === targetRoleName
    );

    if (!role) {
      await interaction.reply({
        content: "Leader role not found for that faction.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await member.roles.add(role);
    await interaction.reply({
      content: `Added ${role.name} to ${member.user.tag}.`,
      flags: MessageFlags.Ephemeral,
    });
  },
  "Add leader role to a member",
  "guild",
  [
    {
      name: "faction",
      description: "Faction name",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "member",
      description: "Server member",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ]
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
