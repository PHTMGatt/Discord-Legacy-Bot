// NOTE; Load environment variables (DISCORD_TOKEN_LEGACY)
require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();

// NOTE; Serve static files (index.html, style.css) from project root
app.use(express.static(__dirname));

// NOTE; Main route: send the styled “Bot is alive!” page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// NOTE; Optional self-ping to prevent Render from sleeping (every 14 minutes)
setInterval(() => {
  fetch('https://discord-legacy-bot.onrender.com')
    .then(() => console.log('🔁 Self-ping successful'))
    .catch(() => console.log('⚠️ Self-ping failed'));
}, 14 * 60 * 1000); // 14 minutes

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

// NOTE; Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// NOTE; In‑memory cache to dedupe repeated commits per channel
const lastCommitByChannel = new Map();

// NOTE; Convert camel-case input into sentence case with spaces & proper punctuation
function toSentenceCase(input) {
  const cleaned = input
    .replace(/[^a-zA-Z0-9.]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(' ').map(w => w.toLowerCase());
  const dupIndex = words.findIndex((w, i) => i > 0 && w === words[i - 1]);

  let sentencesArr;
  if (dupIndex > 0) {
    sentencesArr = [
      words.slice(0, dupIndex + 1),
      words.slice(dupIndex + 1)
    ];
  } else {
    sentencesArr = [words];
  }

  const sentences = sentencesArr.map(arr => {
    const s = arr.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

  return sentences.length
    ? sentences.join('. ') + '.'
    : '';
}

// NOTE; Log when bot is ready
client.once('ready', () => {
  console.log(`✅ Bot is live as ${client.user.tag}`);
});

// NOTE; Handle incoming messages
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  try {
    const me     = await message.guild.members.fetchMe();
    const perms  = message.channel.permissionsFor(me);
    if (!perms?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) return;

    const raw     = message.content;
    const cleaned = toSentenceCase(raw);
    const chanId  = message.channel.id;

    if (!cleaned) return;
    if (lastCommitByChannel.get(chanId) === cleaned) return;
    lastCommitByChannel.set(chanId, cleaned);

    // DELETE original if we have permission
    if (perms.has(PermissionsBitField.Flags.ManageMessages)) {
      await message.delete().catch(() => {});
    }

    // ——— COMMIT MESSAGE ———
    const author  = message.member?.displayName || message.author.username;
    const reply   = [
      `✅ ${author} committed:`,
      '```',
      cleaned,
      '```'
    ].join('\n');

    await message.channel.send(reply);
  } catch (err) {
    console.error('❌ Error handling message:', err);
  }
});

// NOTE; Log in using bot token from .env
client.login(process.env.DISCORD_TOKEN_LEGACY);
