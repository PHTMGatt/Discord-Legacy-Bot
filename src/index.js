// NOTE; Load environment variables (DISCORD_TOKEN_LEGACY)
require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();

// NOTE; Serve static files (index.html + style.css)
app.use(express.static(__dirname));

// NOTE; Serve styled “Bot is alive!” page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// NOTE; Optional self-ping to prevent Render from sleeping (every 14 minutes)
setInterval(() => {
  fetch('https://discord-legacy-bot.onrender.com')
    .then(() => console.log('🔁 Self-ping successful'))
    .catch(() => console.log('⚠️ Self-ping failed'));
}, 14 * 60 * 1000);

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

// NOTE; Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// NOTE; In-memory cache for deduplication
const lastCommitByChannel = new Map();

// NOTE; Convert camelCase or messy input to clean sentence case
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

// NOTE; Bot ready
client.once('ready', () => {
  console.log(`✅ Bot is live as ${client.user.tag}`);
});

// NOTE; Message listener
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  try {
    const me = await message.guild.members.fetchMe();
    const perms = message.channel.permissionsFor(me);
    if (!perms?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) return;

    const raw = message.content;
    const formatted = toSentenceCase(raw);
    const cleaned = formatted.trim().toLowerCase();

    if (!cleaned) return;

    // Deduplicate (ignore if identical)
    const channelId = message.channel.id;
    if (lastCommitByChannel.get(channelId) === cleaned) return;
    lastCommitByChannel.set(channelId, cleaned);

    // Delete original message if allowed
    if (perms.has(PermissionsBitField.Flags.ManageMessages)) {
      await message.delete().catch(() => {});
    }

    // Send formatted commit
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

// NOTE; Login bot
client.login(process.env.DISCORD_TOKEN_LEGACY);
