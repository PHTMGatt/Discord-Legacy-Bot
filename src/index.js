// NOTE; keep the free Render dyno awake by responding on "/"
const express = require("express");
const app = express();
require("dotenv").config();

// Discord bot setup
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

// NOTE; register GitHub webhook route using Octokit middleware
require("./webhooks")(app, client);

// NOTE; health check ping (used to keep dyno awake)
app.get("/", (req, res) => res.send("✅ Bot is alive!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🌐 Web server listening on port ${PORT}`)
);

client.login(process.env.DISCORD_TOKEN);
