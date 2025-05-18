// NOTE; Express keeps the bot alive on Render if needed
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Web server running on port 3000'));

// NOTE; Load environment variables like DISCORD_TOKEN_LEGACY from .env
require('dotenv').config();

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

// NOTE; Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// NOTE; Log when bot is ready
client.once('ready', () => {
  console.log(`✅ Bot is live as ${client.user.tag}`);
});

// NOTE; Convert any message to CamelCase
function toCamelCase(input) {
  return input
    .toLowerCase()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// NOTE; Handle incoming messages
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  try {
    const botMember = await message.guild.members.fetchMe();
    const permissions = message.channel.permissionsFor(botMember);

    // NOTE; Only respond in channels with manual Send Messages permission
    if (!permissions || !permissions.has(PermissionsBitField.Flags.SendMessages)) return;

    const username = message.member?.displayName || message.author.username;
    const cleanedMessage = toCamelCase(message.content);
    const reply = `✅ ${username} committed: \`${cleanedMessage}\``;

    // NOTE; Delete original if bot can manage messages
    if (permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      await message.delete().catch(() => {});
    }

    await message.channel.send(reply);
  } catch (error) {
    console.error('❌ Error handling message:', error);
  }
});

// NOTE; Log in using bot token from .env
client.login(process.env.DISCORD_TOKEN_LEGACY);
