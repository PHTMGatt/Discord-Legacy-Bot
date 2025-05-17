// NOTE; keep the free Render dyno awake by responding on “/”
const express = require("express");
const app = express();

// # Load .env variables (DISCORD_TOKEN, GITHUB_WEBHOOK_SECRET, OPENAI_API_KEY)
require("dotenv").config();

// -------------------------------------------------------------------------------------
// NOTE; HTTP keep-alive endpoint — health checks can hit this
app.get("/", (_req, res) => res.send("✅ Bot is alive!"));

// -------------------------------------------------------------------------------------
// Discord.js client setup
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
client.once("ready", () => {
  console.log(`✅ Discord bot logged in as ${client.user.tag}`);
});

// -------------------------------------------------------------------------------------
// NOTE; import & register GitHub webhook handlers
//       this also mounts the middleware that verifies signature
require("./webhooks")(app, client);

// -------------------------------------------------------------------------------------
// NOTE; start Express + Discord login
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server listening on port ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
