// NOTE; Express keeps the bot alive on Render if needed
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Web server running on port 3000'));

// NOTE; Self-ping every 14 minutes to prevent Render sleeping
setInterval(() => {
  fetch('https://discord-legacy-bot.onrender.com')
    .then(() => console.log('🔁 Self-ping successful'))
    .catch(() => console.log('⚠️ Self-ping failed'));
}, 14 * 60 * 1000); // 14 minutes

// NOTE; Load environment variables
require('dotenv').config();

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ✅ Bot startup log
client.once('ready', () => {
  console.log(`✅ Bot is live as ${client.user.tag}`);
});

// 🧼 Convert message to commit style
function toCamelCase(input) {
  return input
    .toLowerCase()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// 🎯 Only respond in channels where bot has proper permissions
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  try {
    const botMember = await message.guild.members.fetchMe();
    const permissions = message.channel.permissionsFor(botMember);

    // ✅ Only respond if explicitly allowed in channel perms
    if (
      permissions?.has(PermissionsBitField.Flags.SendMessages) &&
      permissions.has(PermissionsBitField.Flags.ManageMessages)
    ) {
      const username = message.member?.displayName || message.author.username;
      const cleaned = toCamelCase(message.content);
      const reply = `✅ ${username} committed: \`${cleaned}\``;

      await message.delete().catch(() => {});
      await message.channel.send(reply);
    }
  } catch (err) {
    console.error('❌ Error in message handler:', err);
  }
});

// 🔐 Start bot login
client.login(process.env.DISCORD_TOKEN_LEGACY);
