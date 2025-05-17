// src/webhooks-dispatcher.js

module.exports = function dispatchWebhooks(app, client) {
  const webhooks = app.get("webhook-handler");

  webhooks.on("push", async ({ payload }) => {
    try {
      for (const guild of client.guilds.cache.values()) {
        const botMember = await guild.members.fetchMe();

        for (const channel of guild.channels.cache.values()) {
          if (!channel.isTextBased()) continue;

          const overwrite = channel.permissionOverwrites.cache.get(botMember.id);
          if (!overwrite?.allow.has("SendMessages")) continue;

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
