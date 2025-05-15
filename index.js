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

// #Note - Convert message to CamelCase
function toCamelCase(input) {
  return input
    .toLowerCase()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const username = message.member?.displayName || message.author.username;
  const cleanedMessage = toCamelCase(message.content);

  const reply = `✅ ${username} committed: ${cleanedMessage}`;

  try {
    await message.delete();
    await message.channel.send(reply);
  } catch (error) {
    console.error('❌ Failed to delete or respond:', error);
  }
});

// #Note - Start the bot using the token from .env
client.login(process.env.DISCORD_TOKEN);
