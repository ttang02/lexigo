// LRU + TTL grid cache. Bounded to avoid unbounded memory growth.
export class GridCache {
  constructor({ ttlMs = 600_000, maxEntries = 1000 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.store = new Map(); // insertion order = recency
  }
  set(gridId, cells) {
    if (this.store.has(gridId)) this.store.delete(gridId);
    this.store.set(gridId, { cells, createdAt: Date.now() });
    if (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
  }
  get(gridId) {
    const entry = this.store.get(gridId);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.store.delete(gridId);
      return null;
    }
    // refresh recency
    this.store.delete(gridId);
    this.store.set(gridId, entry);
    return entry.cells;
  }
}

// Simple solve cache: piggyback on grid TTL via parallel Map, evict on grid eviction.
export class SolveCache {
  constructor({ maxEntries = 1000 } = {}) {
    this.store = new Map();
    this.maxEntries = maxEntries;
  }
  get(gridId) { return this.store.get(gridId) ?? null; }
  set(gridId, solutions) {
    if (this.store.has(gridId)) this.store.delete(gridId);
    this.store.set(gridId, solutions);
    if (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
  }
  delete(gridId) { this.store.delete(gridId); }
}

// Server-authoritative play session. The server, not the client, owns the
// score. Each validated word adds its server-computed score exactly once per
// grid; /api/scores submits THIS total, so a client cannot post an arbitrary
// score. TTL outlives the 2-min game so submission survives the End screen.
export class PlaySessionStore {
  constructor({ ttlMs = 1_800_000, maxEntries = 5000 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.store = new Map(); // gridId -> { total, words:Set, createdAt }
  }
  _fresh(entry) {
    return entry && Date.now() - entry.createdAt <= this.ttlMs;
  }
  // Add a validated word's score once. Returns running total.
  addWord(gridId, word, score) {
    let entry = this.store.get(gridId);
    if (!this._fresh(entry)) {
      entry = { total: 0, words: new Set(), createdAt: Date.now() };
      if (this.store.has(gridId)) this.store.delete(gridId);
      this.store.set(gridId, entry);
      if (this.store.size > this.maxEntries) {
        this.store.delete(this.store.keys().next().value);
      }
    }
    if (!entry.words.has(word)) {
      entry.words.add(word);
      entry.total += score;
    }
    return entry.total;
  }
  // Authoritative total for a grid, or null if no/expired session.
  totalOf(gridId) {
    const entry = this.store.get(gridId);
    if (!this._fresh(entry)) {
      if (entry) this.store.delete(gridId);
      return null;
    }
    return entry.total;
  }
  delete(gridId) { this.store.delete(gridId); }
}
