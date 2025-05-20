// NOTE: Load environment variables (DISCORD_TOKEN_LEGACY)
require('dotenv').config();

// NOTE: Express keeps the bot alive on Render if needed
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Web server running on port 3000'));

// NOTE: Optional self-ping to prevent Render from sleeping (every 14 minutes)
setInterval(() => {
  fetch('https://discord-legacy-bot.onrender.com')
    .then(() => console.log('🔁 Self-ping successful'))
    .catch(() => console.log('⚠️ Self-ping failed'));
}, 14 * 60 * 1000); // 14 minutes

const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

// NOTE: Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// NOTE: In‑memory cache to dedupe repeated commits per channel
const lastCommitByChannel = new Map();

// NOTE: Convert camel‑case input into one or two sentence‑case sentences
function toSentenceCase(input) {
  // 1) Replace non‑alphanumerics (except period) with spaces
  // 2) Insert spaces between lowercase→Uppercase transitions
  // 3) Collapse multiple spaces
  // 4) Split into words
  const cleaned     = input
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  const words       = cleaned.split(' ').map(w => w.toLowerCase());
  // 5) Detect adjacent duplicate word to split into two sentences
  const dupIndex    = words.findIndex((w,i) => i>0 && w === words[i-1]);
  let sentencesArr;

  if (dupIndex > 0) {
    // split at the duplicate boundary
    const first  = words.slice(0, dupIndex + 1);
    const second = words.slice(dupIndex + 1);
    sentencesArr = [ first, second ];
  } else {
    sentencesArr = [ words ];
  }

  // 6) Capitalize each sentence and rejoin
  const sentences = sentencesArr.map(arr => {
    const s = arr.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

  return sentences.join('. ') + '.';
}

// NOTE: Log when bot is ready
client.once('ready', () => {
  console.log(`✅ Bot is live as ${client.user.tag}`);
});

// NOTE: Handle incoming messages
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  try {
    const botMember   = await message.guild.members.fetchMe();
    const perms       = message.channel.permissionsFor(botMember);
    if (!perms?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) return;

    const raw         = message.content;
    const cleaned     = toSentenceCase(raw);
    const channelId   = message.channel.id;

    // nothing to do
    if (!cleaned) return;

    // dedupe: if same as last commit in this channel, ignore
    if (lastCommitByChannel.get(channelId) === cleaned) return;
    lastCommitByChannel.set(channelId, cleaned);

    // delete the original if we can
    if (perms.has(PermissionsBitField.Flags.ManageMessages)) {
      await message.delete().catch(() => {});
    }

    // build a single code‑block reply
    const username = message.member?.displayName || message.author.username;
    const reply = [
      `✅ ${username} committed:`,
      '',
      '```',
      cleaned,
      '```'
    ].join('\n');

    await message.channel.send(reply);
  } catch (err) {
    console.error('❌ Error handling message:', err);
  }
});

// NOTE: Log in using bot token from .env
client.login(process.env.DISCORD_TOKEN_LEGACY);
