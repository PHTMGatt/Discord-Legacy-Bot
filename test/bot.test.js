const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { toSentenceCase, commitHash, sanitize, formatPush, cleanWithGpt } = require('../src/format');
const { Store } = require('../src/store');
const { verifySignature, githubHandler } = require('../src/github');
const { load } = require('../src/config');
const { definitions } = require('../src/commands');

const sign = (secret, body) => 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-bot-'));

test('toSentenceCase cleans and capitalises', () => {
  assert.equal(toSentenceCase('fix  the--bug'), 'Fix the bug.');
  assert.equal(toSentenceCase('   '), '');
});

test('commitHash ignores case and punctuation', () => {
  assert.equal(commitHash('Fix the Bug.'), commitHash('fix the bug'));
});

test('sanitize blocks pings and fence breakouts', () => {
  assert.ok(!sanitize('@everyone hi').includes('@everyone'));
  assert.ok(!sanitize('a ``` b').includes('```'));
});

test('GPT cleanup falls back locally without a key or on error', async () => {
  assert.equal(await cleanWithGpt('hello\nbody'), 'hello');
  const failing = async () => ({ ok: false, status: 500 });
  assert.equal(await cleanWithGpt('hello', { apiKey: 'k', fetchImpl: failing }), 'hello');
  const good = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: ' Clean msg ' } }] }) });
  assert.equal(await cleanWithGpt('hello', { apiKey: 'k', fetchImpl: good }), 'Clean msg');
});

test('formatPush lists commits and caps at 10', async () => {
  const commits = Array.from({ length: 12 }, (_, i) => ({ message: `c${i}`, author: { username: 'bryen' } }));
  const out = await formatPush({ repository: { full_name: 'a/b' }, commits });
  assert.match(out, /^\*\*a\/b\*\*/);
  assert.match(out, /and 2 more/);
});

test('Store watch/unwatch/legacy persist across restarts', () => {
  const dir = tmp();
  const s = new Store(dir);
  assert.equal(s.watch('Owner/Repo', '1'), 'owner/repo');
  s.watch('owner/repo', '1');
  s.setLegacy('9', true);
  const again = new Store(dir);
  assert.deepEqual(again.channelsFor('OWNER/repo'), ['1']);
  assert.ok(again.isLegacy('9'));
  assert.ok(again.unwatch('owner/repo', '1'));
  assert.deepEqual(again.channelsFor('owner/repo'), []);
  assert.throws(() => Store.normalizeRepo('not a repo'));
});

test('verifySignature accepts only the right HMAC', () => {
  const body = Buffer.from('{"a":1}');
  assert.ok(verifySignature('s', body, sign('s', body)));
  assert.ok(!verifySignature('s', body, sign('x', body)));
  assert.ok(!verifySignature('s', body, undefined));
  assert.ok(!verifySignature('', body, sign('', body)));
});

function run(handler, { body, headers }) {
  return new Promise((resolve) => {
    const res = {
      status(c) { this.code = c; return this; },
      sendStatus(c) { resolve(c); },
      send() { resolve(this.code); },
    };
    handler({ body, get: (h) => headers[h.toLowerCase()] }, res);
  });
}

test('github handler: fails closed, verifies, routes, rate limits', async () => {
  const store = new Store(tmp());
  store.watch('a/b', '42');
  const sent = [];
  const make = (secret) => githubHandler({ secret, store, send: async (c, t) => sent.push([c, t]), format: async () => 'msg' });
  const payload = Buffer.from(JSON.stringify({ repository: { full_name: 'A/B' }, commits: [{ message: 'x' }] }));
  const headers = (s) => ({ 'x-hub-signature-256': sign(s, payload), 'x-github-event': 'push' });

  assert.equal(await run(make(''), { body: payload, headers: headers('') }), 503);
  const h = make('sek');
  assert.equal(await run(h, { body: payload, headers: { ...headers('wrong') } }), 401);
  assert.equal(await run(h, { body: payload, headers: { ...headers('sek'), 'x-github-event': 'ping' } }), 200);
  assert.equal(await run(h, { body: payload, headers: headers('sek') }), 200);
  assert.deepEqual(sent, [['42', 'msg']]);
  assert.equal(await run(h, { body: payload, headers: headers('sek') }), 429);

  const other = Buffer.from(JSON.stringify({ repository: { full_name: 'no/watch' }, commits: [{ message: 'x' }] }));
  assert.equal(await run(make('sek'), { body: other, headers: { 'x-hub-signature-256': sign('sek', other), 'x-github-event': 'push' } }), 404);
});

test('config validates PORT and reads env only', () => {
  assert.equal(load({ DISCORD_TOKEN: 't', PORT: '8080' }).port, 8080);
  assert.throws(() => load({ PORT: 'abc' }));
  assert.equal(load({}).port, 3000);
});

test('slash command definitions are valid and unique', () => {
  const names = definitions.map((d) => d.name);
  assert.deepEqual(names, ['commit', 'watch', 'unwatch', 'watching', 'legacymode']);
});
