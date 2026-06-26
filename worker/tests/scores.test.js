/**
 * D1 scores data-access layer tests.
 * Runs inside the Workers runtime via @cloudflare/vitest-pool-workers.
 * Migrations are provided by tests/setup-d1.js globalSetup via inject().
 *
 * isolatedStorage:true resets D1 per-test, but beforeAll() runs once per
 * describe-suite and its writes are visible to all `it` inside that suite.
 */
import { env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll, inject } from "vitest";
import { upsertScore, topScores, rankAndCount } from "../src/scores.js";

// Apply migrations once before all suites (the outermost beforeAll shares
// state with all nested suites when isolatedStorage is true).
beforeAll(async () => {
  const migrations = inject("d1Migrations");
  await applyD1Migrations(env.DB, migrations);
});

// ---------------------------------------------------------------------------
// Mode normalisation
// ---------------------------------------------------------------------------
describe("mode normalisation", () => {
  it("accepts normal, bombe, daily unchanged", async () => {
    const db = env.DB;
    for (const mode of ["normal", "bombe", "daily"]) {
      await upsertScore(db, { pseudo: "ModeTest", score: 1, mode, now: 1000 });
      const rows = await topScores(db, mode, 1);
      expect(rows[0]?.pseudo).toBe("ModeTest");
    }
  });

  it("normalises unknown mode to normal", async () => {
    const db = env.DB;
    await upsertScore(db, { pseudo: "ModeNorm", score: 5, mode: "unknown", now: 2000 });
    const rows = await topScores(db, "normal", 10);
    expect(rows.some((r) => r.pseudo === "ModeNorm")).toBe(true);
  });

  it("normalises missing mode to normal", async () => {
    const db = env.DB;
    await upsertScore(db, { pseudo: "ModeNull", score: 5, mode: undefined, now: 3000 });
    const rows = await topScores(db, "normal", 10);
    expect(rows.some((r) => r.pseudo === "ModeNull")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// upsertScore — each it is self-contained (isolated storage resets per test)
// ---------------------------------------------------------------------------
describe("upsertScore", () => {
  it("inserts a new score and returns changed:true", async () => {
    const db = env.DB;
    const result = await upsertScore(db, { pseudo: "Ada", score: 100, mode: "normal", now: 1000 });
    expect(result).toEqual({ changed: true });
  });

  it("ignores a strictly-lower replacement (changed:false, score unchanged)", async () => {
    const db = env.DB;
    // Insert Ada first, then try to replace with a lower score
    await upsertScore(db, { pseudo: "Ada", score: 100, mode: "normal", now: 1000 });
    const result = await upsertScore(db, { pseudo: "Ada", score: 50, mode: "normal", now: 2000 });
    expect(result).toEqual({ changed: false });

    // Score must still be 100
    const rows = await topScores(db, "normal", 10);
    const ada = rows.find((r) => r.pseudo === "Ada");
    expect(ada?.score).toBe(100);
  });

  it("ignores an equal-score replacement (changed:false)", async () => {
    const db = env.DB;
    await upsertScore(db, { pseudo: "Ada", score: 100, mode: "normal", now: 1000 });
    const result = await upsertScore(db, { pseudo: "Ada", score: 100, mode: "normal", now: 3000 });
    expect(result).toEqual({ changed: false });
  });

  it("accepts a strictly-higher replacement (changed:true, score updated)", async () => {
    const db = env.DB;
    await upsertScore(db, { pseudo: "Ada", score: 100, mode: "normal", now: 1000 });
    const result = await upsertScore(db, { pseudo: "Ada", score: 200, mode: "normal", now: 4000 });
    expect(result).toEqual({ changed: true });

    const rows = await topScores(db, "normal", 10);
    const ada = rows.find((r) => r.pseudo === "Ada");
    expect(ada?.score).toBe(200);
  });

  it("uses the passed-in now for updated_at", async () => {
    const db = env.DB;
    await upsertScore(db, { pseudo: "TimeTest", score: 10, mode: "bombe", now: 99999 });
    const rows = await topScores(db, "bombe", 10);
    const row = rows.find((r) => r.pseudo === "TimeTest");
    expect(row?.updated_at).toBe(99999);
  });

  it("does not mix modes — daily score is separate from normal", async () => {
    const db = env.DB;
    await upsertScore(db, { pseudo: "Ada", score: 200, mode: "normal", now: 1000 });
    await upsertScore(db, { pseudo: "Ada", score: 999, mode: "daily", now: 5000 });

    const rows = await topScores(db, "normal", 10);
    const ada = rows.find((r) => r.pseudo === "Ada");
    // Normal score should be 200, not contaminated by daily
    expect(ada?.score).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// topScores
// ---------------------------------------------------------------------------
describe("topScores", () => {
  beforeAll(async () => {
    const db = env.DB;
    // Seed deterministic data for ordering tests
    await upsertScore(db, { pseudo: "Zara", score: 500, mode: "bombe", now: 1000 });
    await upsertScore(db, { pseudo: "Bob", score: 300, mode: "bombe", now: 2000 });
    // Carol: same score as Zara but inserted later → should appear AFTER Zara
    await upsertScore(db, { pseudo: "Carol", score: 500, mode: "bombe", now: 3000 });
    // Normal mode seed for shape test
    await upsertScore(db, { pseudo: "Ada", score: 100, mode: "normal", now: 1000 });
  });

  it("returns rows with { pseudo, score, updated_at }", async () => {
    const db = env.DB;
    const rows = await topScores(db, "normal", 10);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    const first = rows[0];
    expect(first).toHaveProperty("pseudo");
    expect(first).toHaveProperty("score");
    expect(first).toHaveProperty("updated_at");
  });

  it("orders by score DESC, updated_at ASC", async () => {
    const db = env.DB;
    const rows = await topScores(db, "bombe", 10);
    const names = rows.map((r) => r.pseudo);

    // Zara before Carol (same score 500, Zara's updated_at=1000 < Carol's=3000)
    expect(names.indexOf("Zara")).toBeLessThan(names.indexOf("Carol"));
    // Carol before Bob (Carol:500 > Bob:300)
    expect(names.indexOf("Carol")).toBeLessThan(names.indexOf("Bob"));
  });

  it("respects the limit parameter", async () => {
    const db = env.DB;
    const rows = await topScores(db, "bombe", 2);
    expect(rows.length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// rankAndCount
// ---------------------------------------------------------------------------
describe("rankAndCount", () => {
  beforeAll(async () => {
    const db = env.DB;
    await upsertScore(db, { pseudo: "TopDog", score: 99999, mode: "normal", now: 1000 });
    await upsertScore(db, { pseudo: "Ada", score: 200, mode: "normal", now: 2000 });
    await upsertScore(db, { pseudo: "Eve", score: 50, mode: "normal", now: 3000 });
  });

  it("returns rank:null when pseudo has no score in mode", async () => {
    const db = env.DB;
    const { rank, total } = await rankAndCount(db, "NoSuchUser", "normal");
    expect(rank).toBeNull();
    expect(typeof total).toBe("number");
  });

  it("returns rank:1 for the top scorer", async () => {
    const db = env.DB;
    const { rank } = await rankAndCount(db, "TopDog", "normal");
    expect(rank).toBe(1);
  });

  it("returns correct total count", async () => {
    const db = env.DB;
    const { total } = await rankAndCount(db, "Ada", "normal");
    // TopDog, Ada, Eve → at least 3
    expect(total).toBeGreaterThanOrEqual(3);
  });

  it("rank increases for lower scorers", async () => {
    const db = env.DB;
    const { rank: topRank } = await rankAndCount(db, "TopDog", "normal");
    const { rank: adaRank } = await rankAndCount(db, "Ada", "normal");
    const { rank: eveRank } = await rankAndCount(db, "Eve", "normal");

    expect(topRank).toBe(1);
    expect(adaRank).toBeGreaterThan(topRank);
    expect(eveRank).toBeGreaterThan(adaRank);
  });
});
