// NOTE; keep the free Render dyno awake by responding on “/”
const express = require("express");
const app = express();
require("dotenv").config();

// -------------------------------------------------------------------------------------
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

// -------------------------------------------------------------------------------------
// NOTE; HTTP keep-alive endpoint — GitHub and health checks can hit this
app.get("/", (req, res) => res.send("✅ Bot is alive!"));

// -------------------------------------------------------------------------------------
// NOTE; Import and register GitHub webhook (uses express.raw)
require("./webhooks")(app, client);

// -------------------------------------------------------------------------------------
// NOTE; Start Express + Discord login
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server listening on port ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
