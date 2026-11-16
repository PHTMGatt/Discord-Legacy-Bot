// Commit text formatting: pure local formatter, plus an optional GPT cleanup that always falls back locally.

// Sentence-case a commit message and strip stray punctuation.
function toSentenceCase(input) {
  const cleaned = String(input)
    .replace(/[^a-zA-Z0-9.]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';

  const words = cleaned.split(' ').map((w) => w.toLowerCase());
  const dupIndex = words.findIndex((w, i) => i > 0 && w === words[i - 1]);
  const parts = dupIndex > 0 ? [words.slice(0, dupIndex + 1), words.slice(dupIndex + 1)] : [words];

  const sentences = parts.map((arr) => {
    const s = arr.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
  return sentences.join('. ') + '.';
}

// Normalised key used to drop duplicate commits (case, spaces and punctuation ignored).
function commitHash(input) {
  return String(input).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Keep Discord messages safe: no pings, no code-fence breakouts, bounded length.
function sanitize(text, max = 200) {
  return String(text).replace(/```/g, "'''").replace(/@(everyone|here)/gi, '@​$1').slice(0, max);
}

function cleanLocal(message) {
  return sanitize(String(message).split('\n')[0].trim(), 80);
}

async function cleanWithGpt(message, { apiKey, model, fetchImpl = fetch } = {}) {
  if (!apiKey) return cleanLocal(message);
  try {
    const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 60,
        messages: [
          { role: 'user', content: `Rewrite this Git commit message to be short, clear, and Discord-ready:\n\n"${message}"` },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const out = data.choices?.[0]?.message?.content?.trim();
    return out ? sanitize(out, 120) : cleanLocal(message);
  } catch (err) {
    console.warn('GPT formatting failed, using local cleanup:', err.message);
    return cleanLocal(message);
  }
}

// Turn a GitHub push payload's commits into one message (max 10 lines).
async function formatPush(payload, opts) {
  const all = payload.commits || [];
  const commits = all.slice(0, 10);
  const repo = sanitize(payload.repository?.full_name || 'unknown repo', 100);
  const lines = await Promise.all(
    commits.map(async (c) => {
      const who = sanitize(c.author?.username || c.author?.name || 'unknown', 40);
      return `🪝 ${who} pushed: ${await cleanWithGpt(c.message, opts)}`;
    })
  );
  if (all.length > commits.length) lines.push(`…and ${all.length - commits.length} more commit(s)`);
  return `**${repo}**\n${lines.join('\n')}`;
}

module.exports = { toSentenceCase, commitHash, sanitize, cleanLocal, cleanWithGpt, formatPush };
