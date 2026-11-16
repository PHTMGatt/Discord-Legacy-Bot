// Tiny JSON store. Maps "owner/repo" -> channels, and tracks channels with legacy auto-format on.
// Holds only Discord channel ids (no secrets), so it is safe on disk. Writes are atomic.
const fs = require('fs');
const path = require('path');

const REPO_RE = /^[a-z0-9._-]+\/[a-z0-9._-]+$/i;

class Store {
  constructor(dir) {
    this.file = path.join(dir, 'store.json');
    this.data = { repos: {}, legacy: [] };
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(this.file)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        this.data = { repos: raw.repos || {}, legacy: raw.legacy || [] };
      } catch (err) {
        console.error('store.json unreadable, starting empty:', err.message);
      }
    }
  }

  save() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  static normalizeRepo(repo) {
    const r = String(repo || '').trim().toLowerCase();
    if (!REPO_RE.test(r)) throw new Error('Repo must look like owner/name');
    return r;
  }

  watch(repo, channelId) {
    const r = Store.normalizeRepo(repo);
    const list = (this.data.repos[r] ||= []);
    if (!list.includes(channelId)) list.push(channelId);
    this.save();
    return r;
  }

  unwatch(repo, channelId) {
    const r = Store.normalizeRepo(repo);
    const list = this.data.repos[r] || [];
    const next = list.filter((c) => c !== channelId);
    if (next.length) this.data.repos[r] = next;
    else delete this.data.repos[r];
    this.save();
    return next.length !== list.length;
  }

  channelsFor(repo) {
    return this.data.repos[String(repo).toLowerCase()] || [];
  }

  reposIn(channelId) {
    return Object.entries(this.data.repos)
      .filter(([, c]) => c.includes(channelId))
      .map(([r]) => r);
  }

  setLegacy(channelId, on) {
    const has = this.data.legacy.includes(channelId);
    if (on && !has) this.data.legacy.push(channelId);
    if (!on && has) this.data.legacy = this.data.legacy.filter((c) => c !== channelId);
    this.save();
  }

  isLegacy(channelId) {
    return this.data.legacy.includes(channelId);
  }
}

module.exports = { Store };
