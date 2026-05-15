export class GridCache {
  constructor({ ttlMs = 600_000 } = {}) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }
  set(gridId, cells) {
    this.store.set(gridId, { cells, createdAt: Date.now() });
  }
  get(gridId) {
    const entry = this.store.get(gridId);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.store.delete(gridId);
      return null;
    }
    return entry.cells;
  }
}
