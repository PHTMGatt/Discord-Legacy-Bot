// One command set for the whole bot.
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { toSentenceCase } = require('./format');
const { Store } = require('./store');

const manage = PermissionFlagsBits.ManageChannels;

const definitions = [
  new SlashCommandBuilder()
    .setName('commit')
    .setDescription('Format a commit message')
    .addStringOption((o) => o.setName('text').setDescription('Raw commit text').setRequired(true).setMaxLength(300)),
  new SlashCommandBuilder()
    .setName('watch')
    .setDescription('Post GitHub pushes for a repo into this channel')
    .setDefaultMemberPermissions(manage)
    .setDMPermission(false)
    .addStringOption((o) => o.setName('repo').setDescription('owner/name').setRequired(true)),
  new SlashCommandBuilder()
    .setName('unwatch')
    .setDescription('Stop posting a repo into this channel')
    .setDefaultMemberPermissions(manage)
    .setDMPermission(false)
    .addStringOption((o) => o.setName('repo').setDescription('owner/name').setRequired(true)),
  new SlashCommandBuilder()
    .setName('watching')
    .setDescription('List repos posting into this channel')
    .setDMPermission(false),
  new SlashCommandBuilder()
    .setName('legacymode')
    .setDescription('Auto-format every message in this channel as a commit (Legacy mode)')
    .setDefaultMemberPermissions(manage)
    .setDMPermission(false)
    .addBooleanOption((o) => o.setName('enabled').setDescription('On or off').setRequired(true)),
].map((c) => c.toJSON());

async function handle(interaction, { store }) {
  const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });
  try {
    switch (interaction.commandName) {
      case 'commit': {
        const out = toSentenceCase(interaction.options.getString('text', true));
        return interaction.reply(out ? '```\n' + out.replace(/```/g, "'''") + '\n```' : 'Nothing to format.');
      }
      case 'watch': {
        const repo = store.watch(interaction.options.getString('repo', true), interaction.channelId);
        return reply(`Watching **${repo}** here. Add a GitHub webhook (push events, JSON, your secret) pointing at /github.`);
      }
      case 'unwatch': {
        const repo = Store.normalizeRepo(interaction.options.getString('repo', true));
        return reply(store.unwatch(repo, interaction.channelId) ? `Stopped watching **${repo}**.` : `**${repo}** was not watched here.`);
      }
      case 'watching': {
        const repos = store.reposIn(interaction.channelId);
        return reply(repos.length ? repos.map((r) => `• ${r}`).join('\n') : 'Nothing watched in this channel.');
      }
      case 'legacymode': {
        const on = interaction.options.getBoolean('enabled', true);
        store.setLegacy(interaction.channelId, on);
        return reply(`Legacy mode ${on ? 'on' : 'off'} for this channel.`);
      }
      default:
        return reply('Unknown command.');
    }
  } catch (err) {
    if (interaction.replied || interaction.deferred) return;
    return reply(`Error: ${err.message}`);
  }
}

module.exports = { definitions, handle };
