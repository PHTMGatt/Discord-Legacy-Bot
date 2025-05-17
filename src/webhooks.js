// src/webhooks.js
const { Webhooks, createNodeMiddleware } = require("@octokit/webhooks");
const { Configuration, OpenAIApi } = require("openai");

// NOTE; fallback message formatter
function toCamelCase(input) {
  return input
    .toLowerCase()
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

// NOTE; clean commit messages via OpenAI GPT
async function cleanWithChatGPT(rawMessage) {
  const openai = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY })
  );

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

module.exports = function registerWebhooks(app, client) {
  const webhooks = new Webhooks({
    secret: process.env.GITHUB_WEBHOOK_SECRET,
  });

  // ✅ use Octokit's middleware — no manual parsing!
  app.use(
    "/github-webhook",
    createNodeMiddleware(webhooks, { path: "/github-webhook" })
  );

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
      console.error("❌ Error handling push event:", err);
    }
  });
};
