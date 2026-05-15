import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GridCache } from "../src/gridCache.js";

describe("GridCache", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-01T00:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("stores and retrieves a grid", () => {
    const c = new GridCache({ ttlMs: 10_000 });
    c.set("g1", [{ letter: "A", bonus: null }]);
    expect(c.get("g1")).toEqual([{ letter: "A", bonus: null }]);
  });
  it("returns null past TTL", () => {
    const c = new GridCache({ ttlMs: 10_000 });
    c.set("g1", [{ letter: "A", bonus: null }]);
    vi.advanceTimersByTime(11_000);
    expect(c.get("g1")).toBeNull();
  });
  it("returns null for unknown gridId", () => {
    const c = new GridCache({ ttlMs: 10_000 });
    expect(c.get("nope")).toBeNull();
  });
});
