// Single place that reads environment variables. Secrets come from env only, never from files in git.
const path = require('path');
require('dotenv').config();

function load(env = process.env) {
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be 1-65535, got "${env.PORT}"`);
  }
  return {
    token: env.DISCORD_TOKEN || '',
    // Optional: register slash commands to one guild (instant) instead of globally (up to an hour).
    guildId: env.DISCORD_GUILD_ID || '',
    // Required to accept GitHub pushes. Without it /github answers 503 (fails closed).
    githubSecret: env.GITHUB_WEBHOOK_SECRET || '',
    // Optional: enables GPT commit cleanup. Without it the local formatter is used.
    openaiKey: env.OPENAI_API_KEY || '',
    openaiModel: env.OPENAI_MODEL || 'gpt-4o-mini',
    port,
    dataDir: env.DATA_DIR || path.join(__dirname, '..', 'data'),
  };
}

module.exports = { load };
