import "dotenv/config";
import {
  MessageFlags,
  ApplicationCommandOptionType,
  ChannelType,
  PermissionsBitField,
} from "discord.js";
import botClient from "./bot.js";

const CATEGORY_NAMES = [
  "public chat",
  "public voice",
  "private chat",
  "private voice",
];

const normalize = (value) => value.toLowerCase();
const buildVanillaChannelName = (factionName) => factionName;
const buildPublicVoiceChannelName = (factionName) => factionName;
const buildMemberRoleName = (factionName) => `${factionName} | member`;
const buildLeaderRoleName = (factionName) => `${factionName} | leader`;
const buildRequestRoleName = (factionName) => `${factionName} | request`;
const MEMBER_SUFFIX = " | member";
const LEADER_SUFFIX = " | leader";
const REQUEST_SUFFIX = " | request";

const client = botClient.getClient();

const isFactionRoleName = (name) => {
  const lower = normalize(name);
  return (
    lower.endsWith(MEMBER_SUFFIX) ||
    lower.endsWith(LEADER_SUFFIX) ||
    lower.endsWith(REQUEST_SUFFIX)
  );
};

const getFactionFromRoleName = (name) => {
  const lower = normalize(name);
  if (lower.endsWith(MEMBER_SUFFIX)) {
    return name.slice(0, name.length - MEMBER_SUFFIX.length);
  }
  if (lower.endsWith(LEADER_SUFFIX)) {
    return name.slice(0, name.length - LEADER_SUFFIX.length);
  }
  if (lower.endsWith(REQUEST_SUFFIX)) {
    return name.slice(0, name.length - REQUEST_SUFFIX.length);
  }
  return null;
};

const countFactionRoles = async (guild) => {
  const roles = await guild.roles.fetch();
  const factions = new Map();

  for (const role of roles.values()) {
    const faction = getFactionFromRoleName(role.name);
    if (!faction) continue;
    if (!factions.has(faction)) {
      factions.set(faction, { member: 0, leader: 0, request: 0, total: 0 });
    }
  }

  const members = await guild.members.fetch();
  for (const member of members.values()) {
    for (const role of member.roles.cache.values()) {
      const faction = getFactionFromRoleName(role.name);
      if (!faction) continue;
      const entry = factions.get(faction);
      if (!entry) continue;
      const lower = normalize(role.name);
      if (lower.endsWith(MEMBER_SUFFIX)) entry.member += 1;
      else if (lower.endsWith(LEADER_SUFFIX)) entry.leader += 1;
      else if (lower.endsWith(REQUEST_SUFFIX)) entry.request += 1;
      entry.total += 1;
    }
  }

  return factions;
};

const countFactionRolesFromCache = async (guild) => {
  const roles = await guild.roles.fetch();
  const factions = new Map();

  for (const role of roles.values()) {
    const faction = getFactionFromRoleName(role.name);
    if (!faction) continue;
    if (!factions.has(faction)) {
      factions.set(faction, { member: 0, leader: 0, request: 0, total: 0 });
    }

    const entry = factions.get(faction);
    const lower = normalize(role.name);
    const count = role.members?.size ?? 0;
    if (lower.endsWith(MEMBER_SUFFIX)) entry.member += count;
    else if (lower.endsWith(LEADER_SUFFIX)) entry.leader += count;
    else if (lower.endsWith(REQUEST_SUFFIX)) entry.request += count;
    entry.total += count;
  }

  return factions;
};

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});


client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content.toLowerCase() === "hello") {
    message.channel.send("Hello worldsssss!");
  }
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const oldFactionRoles = oldMember.roles.cache.filter((role) =>
    isFactionRoleName(role.name)
  );
  const newFactionRoles = newMember.roles.cache.filter((role) =>
    isFactionRoleName(role.name)
  );

  const addedRoles = newFactionRoles.filter(
    (role) => !oldFactionRoles.has(role.id)
  );

  if (addedRoles.size > 0) {
    const keepRole = addedRoles.first();
    const toRemove = newFactionRoles.filter(
      (role) => role.id !== keepRole.id
    );
    if (toRemove.size > 0) {
      await newMember.roles.remove(toRemove);
    }
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

    const factionName = interaction.options.getString("name");
    if (!factionName) {
      await interaction.reply({
        content:
          "Missing required option: name. Re-run /createfaction and fill the name field.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (factionName.includes("|")) {
      await interaction.reply({
        content: "Faction name cannot include the '|' character.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    if (guild) {
      const channels = await guild.channels.fetch();
      const publicVoiceName = normalize(buildPublicVoiceChannelName(factionName));
      const vanillaName = normalize(buildVanillaChannelName(factionName));

      const existing = channels.find((channel) => {
        if (!channel || !channel.parent) return false;
        const parentName = normalize(channel.parent.name);
        const channelName = normalize(channel.name);
        if (parentName === "public voice") {
          return channelName === publicVoiceName;
        }
        if (
          parentName === "public chat" ||
          parentName === "private chat" ||
          parentName === "private voice"
        ) {
          return channelName === vanillaName;
        }
        return false;
      });

      if (existing) {
        await interaction.editReply({
          content: "A faction channel with that name already exists.",
        });
        return;
      }

      const roles = await guild.roles.fetch();
      const factionNameLower = normalize(factionName);
      const leaderRoleName = normalize(buildLeaderRoleName(factionName));
      const requestRoleName = normalize(buildRequestRoleName(factionName));
      const memberRoleName = normalize(buildMemberRoleName(factionName));
      const roleExists = roles.some((role) => {
        const roleName = normalize(role.name);
        return (
          roleName === factionNameLower ||
          roleName === memberRoleName ||
          roleName === leaderRoleName ||
          roleName === requestRoleName
        );
      });

      if (roleExists) {
        await interaction.editReply({
          content: "A role with that faction name already exists.",
        });
        return;
      }

      const categories = CATEGORY_NAMES.reduce((acc, name) => {
        const category = channels.find(
          (channel) =>
            channel?.type === ChannelType.GuildCategory &&
            normalize(channel.name) === name
        );
        acc[name] = category ?? null;
        return acc;
      }, {});

      if (Object.values(categories).some((category) => !category)) {
        await interaction.editReply({
          content: "Setup is missing required categories. Run /setup first.",
        });
        return;
      }

      const jailedRole = roles.find(
        (role) => normalize(role.name) === "jailed"
      );

      if (!jailedRole) {
        await interaction.editReply({
          content:
            "Missing required role: jailed. Create a role named 'jailed' first.",
        });
        return;
      }

      const memberRole = await guild.roles.create({
        name: buildMemberRoleName(factionName),
      });
      const leaderRole = await guild.roles.create({
        name: buildLeaderRoleName(factionName),
      });
      const requestRole = await guild.roles.create({
        name: buildRequestRoleName(factionName),
      });

      const publicChatOverwrites = [
        { id: jailedRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: requestRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        {
          id: memberRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        {
          id: leaderRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
      ];

      const privateChatOverwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        { id: jailedRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: memberRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        {
          id: leaderRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
      ];

      const publicVoiceOverwrites = [
        { id: jailedRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      ];

      const privateVoiceOverwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        { id: jailedRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: memberRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
          ],
        },
        {
          id: leaderRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak,
          ],
        },
      ];

      await guild.channels.create({
        name: buildVanillaChannelName(factionName),
        type: ChannelType.GuildText,
        parent: categories["public chat"].id,
        permissionOverwrites: publicChatOverwrites,
      });

      await guild.channels.create({
        name: buildVanillaChannelName(factionName),
        type: ChannelType.GuildText,
        parent: categories["private chat"].id,
        permissionOverwrites: privateChatOverwrites,
      });

      await guild.channels.create({
        name: buildPublicVoiceChannelName(factionName),
        type: ChannelType.GuildVoice,
        parent: categories["public voice"].id,
        permissionOverwrites: publicVoiceOverwrites,
      });

      await guild.channels.create({
        name: buildVanillaChannelName(factionName),
        type: ChannelType.GuildVoice,
        parent: categories["private voice"].id,
        permissionOverwrites: privateVoiceOverwrites,
      });
    }
    await interaction.editReply({
      content: `Create faction: ${factionName}`,
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

    const categoryNames = [...CATEGORY_NAMES];

    const created = await botClient.ensureCategories(guild, categoryNames);
    const roles = await guild.roles.fetch();
    const jailedRole = roles.find(
      (role) => normalize(role.name) === "jailed"
    );
    let createdRole = null;
    if (!jailedRole) {
      createdRole = await guild.roles.create({ name: "jailed" });
    }

    await interaction.reply({
      content:
        created.length > 0
          ? `Setup complete. Created categories: ${created
              .map((c) => c.name)
              .join(", ")}`
          : "Setup complete. All categories already exist.",
      flags: MessageFlags.Ephemeral,
    });

    if (createdRole) {
      await interaction.followUp({
        content: "Created role: jailed",
        flags: MessageFlags.Ephemeral,
      });
    }
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
    const targetRoleName = normalize(buildLeaderRoleName(factionName));
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

    try {
      await member.roles.add(role);
      await interaction.reply({
        content: `Added ${role.name} to ${member.user.tag}.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      await interaction.reply({
        content:
          "I don't have permission to assign roles. Check my role hierarchy and Manage Roles permission.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
  "Add leader role to a member",
  "guild",
  [
    {
      name: "faction",
      description: "Faction name",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: "member",
      description: "Server member",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ]
);

botClient.setAutocomplete("addleader", async (interaction) => {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.respond([]);
    return;
  }

  const focused = normalize(interaction.options.getFocused() ?? "");
  const roles = await guild.roles.fetch();
  const factions = new Set();

  for (const role of roles.values()) {
    const name = role.name;
    const lower = normalize(name);
    if (lower.endsWith(MEMBER_SUFFIX)) {
      const faction = name.slice(0, name.length - MEMBER_SUFFIX.length);
      factions.add(faction);
    }
  }

  const choices = Array.from(factions)
    .filter((name) => normalize(name).includes(focused))
    .slice(0, 25)
    .map((name) => ({ name, value: name }));

  await interaction.respond(choices);
});

await botClient.createSlashCommand(
  "joinfaction",
  async (interaction) => {
    const factionName = interaction.options.getString("faction");
    if (!factionName) {
      await interaction.reply({
        content: "Missing required option: faction.",
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

    const member = await guild.members.fetch(interaction.user.id);
    const hasFactionRole = member.roles.cache.some((role) => {
      const name = normalize(role.name);
      return (
        name.endsWith(MEMBER_SUFFIX) ||
        name.endsWith(LEADER_SUFFIX) ||
        name.endsWith(REQUEST_SUFFIX)
      );
    });

    if (hasFactionRole) {
      const currentFactionRoles = member.roles.cache
        .filter((role) => isFactionRoleName(role.name))
        .map((role) => role.name);
      await interaction.reply({
        content: `You can only be in one faction at a time. Current roles: ${currentFactionRoles.join(
          ", "
        )}. Use /leavefaction to leave.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const roles = await guild.roles.fetch();
    const requestRoleName = normalize(buildRequestRoleName(factionName));
    const requestRole = roles.find(
      (role) => normalize(role.name) === requestRoleName
    );

    if (!requestRole) {
      await interaction.reply({
        content: "That faction does not exist.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await member.roles.add(requestRole);
      await interaction.reply({
        content: `Request sent for ${factionName}.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      await interaction.reply({
        content:
          "I don't have permission to assign roles. Check my role hierarchy and Manage Roles permission.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
  "Join a faction",
  "guild",
  [
    {
      name: "faction",
      description: "Faction name",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ]
);

botClient.setAutocomplete("joinfaction", async (interaction) => {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.respond([]);
    return;
  }

  const focused = normalize(interaction.options.getFocused() ?? "");
  const roles = await guild.roles.fetch();
  const factions = new Set();

  for (const role of roles.values()) {
    const name = role.name;
    const lower = normalize(name);
    if (lower.endsWith(MEMBER_SUFFIX)) {
      const faction = name.slice(0, name.length - MEMBER_SUFFIX.length);
      factions.add(faction);
    }
  }

  const choices = Array.from(factions)
    .filter((name) => normalize(name).includes(focused))
    .slice(0, 25)
    .map((name) => ({ name, value: name }));

  await interaction.respond(choices);
});

await botClient.createSlashCommand(
  "leavefaction",
  async (interaction) => {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: "This command must be run in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const member = await guild.members.fetch(interaction.user.id);
    const rolesToRemove = member.roles.cache.filter((role) => {
      const name = normalize(role.name);
      return (
        name.endsWith(MEMBER_SUFFIX) ||
        name.endsWith(LEADER_SUFFIX) ||
        name.endsWith(REQUEST_SUFFIX)
      );
    });

    if (rolesToRemove.size === 0) {
      await interaction.reply({
        content: "You are not in any faction.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await member.roles.remove(rolesToRemove);
      await interaction.reply({
        content: "You have left your faction.",
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      await interaction.reply({
        content:
          "I don't have permission to remove roles. Check my role hierarchy and Manage Roles permission.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
  "Leave your faction",
  "guild"
);

await botClient.createSlashCommand(
  "approverequest",
  async (interaction) => {
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

    const leaderFactions = interaction.member.roles.cache
      .filter((role) => normalize(role.name).endsWith(LEADER_SUFFIX))
      .map((role) => getFactionFromRoleName(role.name))
      .filter(Boolean);

    if (leaderFactions.length === 0) {
      await interaction.reply({
        content: "Only faction leaders can approve requests.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const uniqueFactions = Array.from(new Set(leaderFactions));
    if (uniqueFactions.length !== 1) {
      await interaction.reply({
        content:
          "You lead multiple factions. Ask an admin to approve or temporarily remove extra leader roles.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const factionName = uniqueFactions[0];
    const roles = await interaction.guild.roles.fetch();
    const requestRoleName = normalize(buildRequestRoleName(factionName));
    const memberRoleName = normalize(buildMemberRoleName(factionName));
    const requestRole = roles.find(
      (role) => normalize(role.name) === requestRoleName
    );
    const memberRole = roles.find(
      (role) => normalize(role.name) === memberRoleName
    );

    if (!requestRole || !memberRole) {
      await interaction.reply({
        content: "Faction roles not found for your faction.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!member.roles.cache.has(requestRole.id)) {
      await interaction.reply({
        content: "That user does not have a request role for your faction.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await member.roles.remove(requestRole);
      await member.roles.add(memberRole);
      await interaction.reply({
        content: `Approved ${member.user.tag} for ${factionName}.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      await interaction.reply({
        content:
          "I don't have permission to modify roles. Check my role hierarchy and Manage Roles permission.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
  "Approve a faction join request",
  "guild",
  [
    {
      name: "member",
      description: "Server member",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ]
);

await botClient.createSlashCommand(
  "removeleader",
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
    const targetRoleName = normalize(buildLeaderRoleName(factionName));
    const role = roles.find(
      (r) => normalize(r.name) === targetRoleName
    );

    if (!role) {
      await interaction.reply({
        content: "Leader role not found for that faction.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!member.roles.cache.has(role.id)) {
      await interaction.reply({
        content: "That member does not have the leader role.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await member.roles.remove(role);
      await interaction.reply({
        content: `Removed ${role.name} from ${member.user.tag}.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      await interaction.reply({
        content:
          "I don't have permission to modify roles. Check my role hierarchy and Manage Roles permission.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
  "Remove leader role from a member",
  "guild",
  [
    {
      name: "faction",
      description: "Faction name",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: "member",
      description: "Server member",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ]
);

botClient.setAutocomplete("removeleader", async (interaction) => {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.respond([]);
    return;
  }

  const focused = normalize(interaction.options.getFocused() ?? "");
  const roles = await guild.roles.fetch();
  const factions = new Set();

  for (const role of roles.values()) {
    const name = role.name;
    const lower = normalize(name);
    if (lower.endsWith(MEMBER_SUFFIX)) {
      const faction = name.slice(0, name.length - MEMBER_SUFFIX.length);
      factions.add(faction);
    }
  }

  const choices = Array.from(factions)
    .filter((name) => normalize(name).includes(focused))
    .slice(0, 25)
    .map((name) => ({ name, value: name }));

  await interaction.respond(choices);
});

await botClient.createSlashCommand(
  "removemember",
  async (interaction) => {
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

    const leaderFactions = interaction.member.roles.cache
      .filter((role) => normalize(role.name).endsWith(LEADER_SUFFIX))
      .map((role) => getFactionFromRoleName(role.name))
      .filter(Boolean);

    if (leaderFactions.length === 0) {
      await interaction.reply({
        content: "Only faction leaders can remove members.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const uniqueFactions = Array.from(new Set(leaderFactions));
    if (uniqueFactions.length !== 1) {
      await interaction.reply({
        content:
          "You lead multiple factions. Ask an admin to remove members.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const factionName = uniqueFactions[0];
    const roles = await interaction.guild.roles.fetch();
    const memberRoleName = normalize(buildMemberRoleName(factionName));
    const memberRole = roles.find(
      (role) => normalize(role.name) === memberRoleName
    );

    if (!memberRole) {
      await interaction.reply({
        content: "Member role not found for your faction.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!member.roles.cache.has(memberRole.id)) {
      await interaction.reply({
        content: "That user is not a member of your faction.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await member.roles.remove(memberRole);
      await interaction.reply({
        content: `Removed ${member.user.tag} from ${factionName}.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      await interaction.reply({
        content:
          "I don't have permission to modify roles. Check my role hierarchy and Manage Roles permission.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
  "Remove a member from your faction",
  "guild",
  [
    {
      name: "member",
      description: "Server member",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ]
);

botClient.setAutocomplete("delete", async (interaction) => {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.respond([]);
    return;
  }

  const focused = normalize(interaction.options.getFocused() ?? "");
  const roles = await guild.roles.fetch();
  const factions = new Set();

  for (const role of roles.values()) {
    const name = role.name;
    const lower = normalize(name);
    if (lower.endsWith(MEMBER_SUFFIX)) {
      const faction = name.slice(0, name.length - MEMBER_SUFFIX.length);
      factions.add(faction);
    }
  }

  const choices = Array.from(factions)
    .filter((name) => normalize(name).includes(focused))
    .slice(0, 25)
    .map((name) => ({ name, value: name }));

  await interaction.respond(choices);
});

await botClient.createSlashCommand(
  "help",
  async (interaction) => {
    await interaction.reply({
      content:
        "Commands: /setup, /createfaction, /joinfaction, /leavefaction, /approverequest, /delete, /addleader, /removeleader, /removemember, /countfactions",
      flags: MessageFlags.Ephemeral,
    });
  },
  "Show help",
  "guild"
);

await botClient.createSlashCommand(
  "countfactions",
  async (interaction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply({
        content: "This command must be run in a server.",
      });
      return;
    }

    let counts;
    let usedCacheOnly = false;
    try {
      const fullCountPromise = countFactionRoles(guild);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("COUNT_TIMEOUT")), 6000)
      );
      counts = await Promise.race([fullCountPromise, timeoutPromise]);
    } catch (error) {
      if (error?.name === "GatewayRateLimitError" || error?.message === "COUNT_TIMEOUT") {
        counts = await countFactionRolesFromCache(guild);
        usedCacheOnly = true;
      } else {
        throw error;
      }
    }
    if (counts.size === 0) {
      await interaction.editReply({
        content: "No faction roles found.",
      });
      return;
    }

    const lines = [];
    for (const [faction, c] of counts.entries()) {
      lines.push(
        `${faction}: total ${c.total} (member ${c.member}, leader ${c.leader}, request ${c.request})`
      );
    }

    await interaction.editReply({
      content: usedCacheOnly
        ? `Using cached counts only.\n${lines.join("\n")}`
        : lines.join("\n"),
    });

  },
  "Count faction roles",
  "guild"
);

await botClient.createSlashCommand(
  "delete",
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

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const factionName = interaction.options.getString("faction", true);
    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply({
        content: "This command must be run in a server.",
      });
      return;
    }

    const channels = await guild.channels.fetch();
    const vanillaName = normalize(buildVanillaChannelName(factionName));
    const publicVoiceName = normalize(buildPublicVoiceChannelName(factionName));

    const channelsToDelete = channels.filter((channel) => {
      if (!channel || !channel.parent) return false;
      const parentName = normalize(channel.parent.name);
      const channelName = normalize(channel.name);
      if (parentName === "public voice") {
        return channelName === publicVoiceName;
      }
      if (
        parentName === "public chat" ||
        parentName === "private chat" ||
        parentName === "private voice"
      ) {
        return channelName === vanillaName;
      }
      return false;
    });

    for (const channel of channelsToDelete.values()) {
      await channel.delete();
    }

    const roles = await guild.roles.fetch();
    const roleNames = [
      normalize(buildMemberRoleName(factionName)),
      normalize(buildLeaderRoleName(factionName)),
      normalize(buildRequestRoleName(factionName)),
    ];

    const rolesToDelete = roles.filter((role) =>
      roleNames.includes(role.name.toLowerCase())
    );

    for (const role of rolesToDelete.values()) {
      await role.delete();
    }

    try {
      await interaction.editReply({
        content: "Faction channels and roles deleted (if they existed).",
      });
    } catch (error) {
      console.error("Failed to edit delete reply:", error);
    }
  },
  "Delete a faction",
  "guild",
  [
    {
      name: "faction",
      description: "Faction name",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ]
);

await botClient.syncCommands();
