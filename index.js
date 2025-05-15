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

client.on('messageCreate', (message) => {
  // #Note - Ignore bot’s own messages
  if (message.author.bot) return;

  const content = message.content.trim().toLowerCase();
  const username = message.member?.displayName || message.author.username;

  const reply = `✅ [${username}] added a [${content}]`;
  message.channel.send(reply);
});

// #Note - Start the bot using the token from .env
client.login(process.env.DISCORD_TOKEN);

// Note - The bot will respond to messages in the channel with a confirmation message