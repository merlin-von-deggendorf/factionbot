import "dotenv/config";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import dbClient from "./db.js";
import botClient from "./bot.js";

const client = botClient.getClient();

client.once("clientReady", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content.toLowerCase() === "hello") {
    message.channel.send("Hello worlds!");
  }
});

await botClient.connect();
await botClient.createSlashCommand("help", async (interaction) => {
  await interaction.reply({
    content: "Commands: /help",
    ephemeral: true,
  });
});

await botClient.createSlashCommand(
  "createFaction",
  async (interaction) => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("createFaction_ok")
        .setLabel("ok")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: "Create a faction?",
      components: [row],
      ephemeral: true,
    });
  },
  "Create a faction"
);
