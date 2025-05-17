// src/webhooks.js

// NOTE; this module sets up a single /github-webhook endpoint
//       and handles all incoming “push” events from any GitHub repo
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

module.exports = function registerWebhooks(app) {
  const webhooks = new Webhooks({
    secret: process.env.GITHUB_WEBHOOK_SECRET,
  });

  // Route must use raw body for signature check
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
        return res.sendStatus(401);
      }
    }
  );

  // Store for dispatcher
  app.set("webhook-handler", webhooks);
};
