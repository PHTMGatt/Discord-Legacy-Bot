// NOTE; Load environment variables (DISCORD_TOKEN_LEGACY)
require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();

// NOTE; Serve static files from src/
app.use(express.static(path.join(__dirname)));

// NOTE; Route to styled status page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// NOTE; Keep bot alive on Render
setInterval(() => {
  fetch('https://discord-legacy-bot.onrender.com')
    .then(() => console.log('🔁 Self-ping successful'))
    .catch(() => console.log('⚠️ Self-ping failed'));
}, 14 * 60 * 1000); // every 14 minutes

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

// NOTE; Init Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// NOTE; Store last commit to prevent duplicates
const lastCommitByChannel = new Map();

// NOTE; Format input into clean sentence case
function toSentenceCase(input) {
  const cleaned = input
    .replace(/[^a-zA-Z0-9.]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(' ').map(w => w.toLowerCase());
  const dupIndex = words.findIndex((w, i) => i > 0 && w === words[i - 1]);

  const parts = dupIndex > 0
    ? [words.slice(0, dupIndex + 1), words.slice(dupIndex + 1)]
    : [words];

  const sentences = parts.map(arr => {
    const s = arr.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

  return sentences.join('. ') + '.';
}

// NOTE; Bot ready log
client.once('ready', () => {
  console.log(`✅ Bot is live as ${client.user.tag}`);
});

// NOTE; Listen for commit-style messages
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  try {
    const me = await message.guild.members.fetchMe();
    const perms = message.channel.permissionsFor(me);
    if (!perms?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) return;

    const raw = message.content;
    const formatted = toSentenceCase(raw).trim();

    if (!formatted || formatted.length < 2) return;

    const channelId = message.channel.id;
    if (lastCommitByChannel.get(channelId) === formatted) return;
    lastCommitByChannel.set(channelId, formatted);

    if (perms.has(PermissionsBitField.Flags.ManageMessages)) {
      await message.delete().catch(() => {});
    }

    const username = message.member?.displayName || message.author.username;
    const reply = [
      `✅ ${username} committed:`,
      '```',
      formatted,
      '```'
    ].join('\n');

    await message.channel.send(reply);
  } catch (err) {
    console.error('❌ Error handling message:', err);
  }
});

// NOTE; Log in with bot token
client.login(process.env.DISCORD_TOKEN_LEGACY);
