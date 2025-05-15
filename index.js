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

// #Note - Strict CamelCase formatting
function toCamelCase(input) {
  return input
    .toLowerCase()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .map((word, i) => i === 0
      ? word.charAt(0).toUpperCase() + word.slice(1)
      : word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  const username = message.member?.displayName || message.author.username;
  const cleaned = toCamelCase(message.content);

  const reply = `✅ ${username} committed: ${cleaned}`;

  message.delete()
    .then(() => message.channel.send(reply))
    .catch(console.error);
});

client.login(process.env.DISCORD_TOKEN);
