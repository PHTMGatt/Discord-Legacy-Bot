// GitHub push webhook: HMAC verification and the Express route handler.
const crypto = require('crypto');

function verifySignature(secret, rawBody, header) {
  if (!secret || !header || !Buffer.isBuffer(rawBody)) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(header));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// deps: { secret, store, send(channelId, text), format(payload) }
function githubHandler({ secret, store, send, format, cooldownMs = 5000 }) {
  const last = new Map();
  return async (req, res) => {
    if (!secret) return res.status(503).send('GITHUB_WEBHOOK_SECRET is not set');
    if (!verifySignature(secret, req.body, req.get('x-hub-signature-256'))) return res.sendStatus(401);

    const event = req.get('x-github-event');
    if (event === 'ping') return res.sendStatus(200);
    if (event !== 'push') return res.sendStatus(204);

    let payload;
    try {
      payload = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.sendStatus(400);
    }
    const repo = payload.repository?.full_name?.toLowerCase();
    if (!repo || !payload.commits?.length) return res.sendStatus(204);

    const channels = store.channelsFor(repo);
    if (!channels.length) return res.status(404).send('No channel watches this repo');

    const now = Date.now();
    if (now - (last.get(repo) || 0) < cooldownMs) return res.sendStatus(429);
    last.set(repo, now);

    try {
      const text = await format(payload);
      await Promise.all(channels.map((c) => send(c, text)));
      res.sendStatus(200);
    } catch (err) {
      console.error('Failed to post push:', err.message);
      res.sendStatus(500);
    }
  };
}

module.exports = { verifySignature, githubHandler };
