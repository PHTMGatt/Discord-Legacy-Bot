// NOTE; keep the free Render dyno awake by responding on “/”
const express = require("express");
const app = express();

// # Load .env variables (DISCORD_TOKEN, GITHUB_WEBHOOK_SECRET, OPENAI_API_KEY)
require("dotenv").config();

// NOTE; HTTP keep-alive endpoint — GitHub and health checks can hit this
app.get("/", (req, res) => res.send("✅ Bot is alive!"));

// NOTE; bodyParser is NOT used globally — GitHub requires raw body for HMAC
// Only apply raw body parsing to the GitHub webhook route
const webhookMiddleware = require("./webhooks");
app.use("/github-webhook", express.raw({ type: "application/json" }), webhookMiddleware);

// NOTE; Discord.js client setup
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

// NOTE; start Express + Discord login
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server listening on port ${PORT}`));
client.login(process.env.DISCORD_TOKEN);

// NOTE; register the Discord bot with webhook handler
webhookMiddleware.setClient(client);

// Testing pushes 1