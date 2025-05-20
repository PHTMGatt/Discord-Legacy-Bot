// NOTE; Load environment variables (DISCORD_TOKEN_LEGACY)
require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();

// NOTE; Serve static files from src/
app.use(express.static(path.join(__dirname)));

// NOTE; Serve styled status page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// NOTE; Use assigned port from Render or fallback to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// NOTE; Keep bot alive on Render
setInterval(() => {
  fetch('https://discord-legacy-bot.onrender.com')
    .then(() => console.log('🔁 Self-ping successful'))
    .catch(() => console.log('⚠️ Self-ping failed'));
}, 14 * 60 * 1000);

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

// NOTE; Init Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// NOTE; Cache to prevent duplicates per channel
const lastCommitByChannel = new Map(); // { channelId: { hash: string, timestamp: number } }

// NOTE; Format commit to sentence case and clean punctuation
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

// NOTE; Strict hash generator to normalize comparison
function generateCommitHash(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // remove spaces, punctuation, casing
    .trim();
}

// NOTE; Log when bot is ready
client.once('ready', () => {
  console.log(`✅ Bot is live as ${client.user.tag}`);
});

// NOTE; Message handler
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  try {
    const me = await message.guild.members.fetchMe();
    const perms = message.channel.permissionsFor(me);
    if (!perms?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) return;

    const raw = message.content;
    const formatted = toSentenceCase(raw).trim();
    const hash = generateCommitHash(formatted);
    const channelId = message.channel.id;
    const now = Date.now();

    // NOTE; Check last commit hash + cooldown window
    const last = lastCommitByChannel.get(channelId);
    if (last && last.hash === hash && now - last.timestamp < 30000) return;

    // NOTE; Store new hash + time
    lastCommitByChannel.set(channelId, { hash, timestamp: now });

    // NOTE; Delete original if allowed
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

// NOTE; Log in using bot token
client.login(process.env.DISCORD_TOKEN_LEGACY);
