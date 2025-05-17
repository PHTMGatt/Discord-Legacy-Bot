// src/webhooks.js

const express = require("express");
const { Webhooks } = require("@octokit/webhooks");
const { Configuration, OpenAIApi } = require("openai");

function toCamelCase(input) {
  return input
    .toLowerCase()
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

async function cleanWithChatGPT(rawMessage) {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  const prompt = `Rewrite this Git commit message to be short, clear, and presentable for Discord:\n\n"${rawMessage}"`;
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 60,
  });

  return (
    response?.data?.choices?.[0]?.message?.content.trim() ||
    toCamelCase(rawMessage)
  );
}

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET,
});

// NOTE; Route must use raw buffer middleware BEFORE body-parser
module.exports = function registerWebhooks(app) {
  app.post(
    "/github-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        await webhooks.verifyAndReceive({
          id: req.headers["x-github-delivery"],
          name: req.headers["x-github-event"],
          signature: req.headers["x-hub-signature-256"],
          payload: JSON.parse(req.body.toString()),
        });
        res.sendStatus(200);
      } catch (err) {
        console.error("❌ Webhook verification failed:", err.message);
        res.sendStatus(401);
      }
    }
  );
};

// Allow injecting Discord client after bot is ready
module.exports.setWebhookHandler = function (client) {
  webhooks.on("push", async ({ payload }) => {
    try {
      for (const guild of client.guilds.cache.values()) {
        const botMember = await guild.members.fetchMe();

        for (const channel of guild.channels.cache.values()) {
          if (!channel.isTextBased()) continue;

          const perms = channel.permissionOverwrites.cache.get(botMember.id);
          if (!perms?.allow.has("SendMessages")) continue;

          const lines = await Promise.all(
            payload.commits.map(async (c) => {
              const sha = c.id.slice(0, 7);
              const cleaned = await cleanWithChatGPT(c.message);
              const author = c.author.username || c.author.name || "unknown";
              return `🔨 **${author}** pushed [\`${sha}\`](${c.url}): \`${cleaned}\``;
            })
          );

          await channel.send(lines.join("\n"));
        }
      }
    } catch (err) {
      console.error("❌ Error handling push event:", err.message);
    }
  });
};
