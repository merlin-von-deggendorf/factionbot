import "dotenv/config";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { LabelBuilder } from "@discordjs/builders";
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
  "generatefaction",
  async (interaction) => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("createFaction_ok")
        .setLabel("ok")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: "Create a faction? Click ok to enter a name.",
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
  "Create a faction"
);

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton() && interaction.customId === "createFaction_ok") {
    const modal = new ModalBuilder()
      .setCustomId("createFaction_modal")
      .setTitle("Create Faction");

    const nameInput = new TextInputBuilder()
      .setCustomId("createFaction_name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const label = new LabelBuilder()
      .setLabel("Faction name")
      .setTextInputComponent(nameInput);

    modal.addLabelComponents(label);

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "createFaction_modal") {
    const factionName = interaction.fields.getTextInputValue("createFaction_name");
    await interaction.reply({
      content: `Faction name: ${factionName}`,
      flags: MessageFlags.Ephemeral,
    });
  }
});
