// Legacy Bot: commit formatter + GitHub push alerts in one Discord bot.
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, PermissionsBitField, Events } = require('discord.js');
const { load } = require('./config');
const { Store } = require('./store');
const { githubHandler } = require('./github');
const { toSentenceCase, commitHash, formatPush } = require('./format');
const commands = require('./commands');

function buildApp({ config, store, send }) {
  const app = express();
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/healthz', (_req, res) => res.status(200).send('Legacy Bot is healthy'));
  app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
  // Raw body is required to verify GitHub's HMAC signature.
  app.post(
    '/github',
    express.raw({ type: 'application/json', limit: '1mb' }),
    githubHandler({
      secret: config.githubSecret,
      store,
      send,
      format: (payload) => formatPush(payload, { apiKey: config.openaiKey, model: config.openaiModel }),
    })
  );
  return app;
}

function main() {
  const config = load();
  if (!config.token) {
    console.error('DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  if (!config.githubSecret) console.warn('GITHUB_WEBHOOK_SECRET is not set: /github will refuse pushes.');

  const store = new Store(config.dataDir);
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  const send = async (channelId, content) => {
    const channel = await client.channels.fetch(channelId);
    await channel.send({ content, allowedMentions: { parse: [] } });
  };

  buildApp({ config, store, send }).listen(config.port, () => console.log(`Web server on port ${config.port}`));

  client.once(Events.ClientReady, async () => {
    console.log(`Bot is live as ${client.user.tag}`);
    try {
      if (config.guildId) await (await client.guilds.fetch(config.guildId)).commands.set(commands.definitions);
      else await client.application.commands.set(commands.definitions);
      console.log('Slash commands registered');
    } catch (err) {
      console.error('Could not register slash commands:', err.message);
    }
  });

  client.on(Events.InteractionCreate, (interaction) => {
    if (interaction.isChatInputCommand()) commands.handle(interaction, { store });
  });

  // Legacy mode (opt-in per channel): rewrite messages as commits.
  const lastByChannel = new Map();
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild || !store.isLegacy(message.channel.id)) return;
    try {
      const me = await message.guild.members.fetchMe();
      const perms = message.channel.permissionsFor(me);
      if (!perms?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) return;

      const formatted = toSentenceCase(message.content);
      if (!formatted) return;
      const hash = commitHash(formatted);
      const now = Date.now();
      const last = lastByChannel.get(message.channel.id);
      if (last && last.hash === hash && now - last.timestamp < 30000) return;
      lastByChannel.set(message.channel.id, { hash, timestamp: now });

      if (perms.has(PermissionsBitField.Flags.ManageMessages)) await message.delete().catch(() => {});
      const name = message.member?.displayName || message.author.username;
      await message.channel.send({
        content: `✅ ${name} committed:\n\`\`\`\n${formatted.replace(/```/g, "'''")}\n\`\`\``,
        allowedMentions: { parse: [] },
      });
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  client.login(config.token);
}

if (require.main === module) main();

module.exports = { buildApp };
