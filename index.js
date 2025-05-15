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

// #Note - CamelCase converter for clean output
function toCamelCase(input) {
  return input
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

client.on('messageCreate', (message) => {
  // #Note - Ignore bot’s own messages
  if (message.author.bot) return;

  const username = message.member?.displayName || message.author.username;
  const cleaned = toCamelCase(message.content);

  const reply = `✅ ${username} pushed: ${cleaned}`;

  // #Note - Delete user message, then send formatted bot reply
  message.delete()
    .then(() => message.channel.send(reply))
    .catch(console.error);
});

// #Note - Start the bot using the token from .env
client.login(process.env.DISCORD_TOKEN);
