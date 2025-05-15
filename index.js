// #Note - Express keeps Render's free instance from sleeping
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Web server running on port 3000'));

// #Note - Load environment variables like DISCORD_TOKEN from .env file
require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

// #Note - Intents required for reading messages
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`✅ Bot is live as ${client.user.tag}`);
});

// #Note - Convert user message to cleaner format
function simplifyMessage(raw) {
  const cleaned = raw.toLowerCase().trim();
  const words = cleaned.split(" ");
  return words.slice(0, 5).join(" "); // Limit to first 5 words
}

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  const username = message.member?.displayName || message.author.username;
  const shortMessage = simplifyMessage(message.content);

  const reply = `✅ ${username} pushed: "${shortMessage}"`;
  message.channel.send(reply);
});

client.login(process.env.DISCORD_TOKEN);
