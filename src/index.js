// NOTE; keep the free Render dyno awake by responding on “/”
const express = require("express");
const app = express();

// # Load .env variables (DISCORD_TOKEN, GITHUB_WEBHOOK_SECRET, OPENAI_API_KEY)
require("dotenv").config();

// -------------------------------------------------------------------------------------
// NOTE; webhook route uses express.raw — so we must register it BEFORE body-parser
require("./webhooks")(app); // <-- must be first

// -------------------------------------------------------------------------------------
// NOTE; HTTP keep-alive endpoint — GitHub and health checks can hit this
app.get("/", (req, res) => res.send("✅ Bot is alive!"));

// -------------------------------------------------------------------------------------
// Register body parser AFTER webhook route
const bodyParser = require("body-parser");
app.use(bodyParser.json());

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

// Register webhook listener with bot access
const { setWebhookHandler } = require("./webhooks");
setWebhookHandler(client);

// -------------------------------------------------------------------------------------
// Start server + Discord login
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server listening on port ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
