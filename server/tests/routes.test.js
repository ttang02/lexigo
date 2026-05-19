import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { Trie, normalize } from "../src/dict.js";
import { createDb } from "../src/db.js";
import { GridCache } from "../src/gridCache.js";

function makeApp() {
  const trie = new Trie();
  ["CHAT", "CHIEN", "ABAT"].forEach((w) => trie.insert(w));
  const db = createDb(":memory:");
  const cache = new GridCache({ ttlMs: 60_000 });
  return { app: buildApp({ trie, db, cache, normalize }), db, cache };
}

describe("GET /api/grid", () => {
  it("returns 16 cells and stores in cache", async () => {
    const { app, cache } = makeApp();
    const res = await request(app).get("/api/grid");
    expect(res.status).toBe(200);
    expect(res.body.cells).toHaveLength(16);
    expect(typeof res.body.gridId).toBe("string");
    expect(cache.get(res.body.gridId)).not.toBeNull();
  });
});

describe("POST /api/validate", () => {
  let ctx;
  beforeEach(async () => {
    ctx = makeApp();
    ctx.gridId = "fixed-id";
    ctx.cache.set("fixed-id", [
      { letter: "C", bonus: null }, { letter: "H", bonus: null }, { letter: "A", bonus: null }, { letter: "T", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null }, { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null }, { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null }, { letter: "X", bonus: null }, { letter: "X", bonus: null },
    ]);
  });
  it("validates a known word", async () => {
    const res = await request(ctx.app).post("/api/validate").send({ gridId: "fixed-id", path: [0,1,2,3], word: "CHAT" });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.score).toBeGreaterThan(0);
  });
  it("rejects unknown word", async () => {
    const res = await request(ctx.app).post("/api/validate").send({ gridId: "fixed-id", path: [0,1], word: "CH" });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.reason).toMatch(/dict/i);
  });
  it("rejects non-adjacent path", async () => {
    const res = await request(ctx.app).post("/api/validate").send({ gridId: "fixed-id", path: [0,3], word: "CT" });
    expect(res.status).toBe(400);
  });
  it("rejects when word/path mismatch", async () => {
    const res = await request(ctx.app).post("/api/validate").send({ gridId: "fixed-id", path: [0,1,2,3], word: "DOGS" });
    expect(res.status).toBe(400);
  });
  it("rejects expired/unknown grid", async () => {
    const res = await request(ctx.app).post("/api/validate").send({ gridId: "missing", path: [0,1], word: "AB" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/scores + GET /api/scores", () => {
  it("upserts and lists", async () => {
    const { app } = makeApp();
    const r1 = await request(app).post("/api/scores").send({ pseudo: "alice", score: 100 });
    expect(r1.status).toBe(200);
    expect(r1.body.ok).toBe(true);
    expect(r1.body.rank).toBe(1);
    await request(app).post("/api/scores").send({ pseudo: "bob", score: 50 });
    const r2 = await request(app).get("/api/scores?limit=10");
    expect(r2.status).toBe(200);
    expect(r2.body.map((r) => r.pseudo)).toEqual(["alice", "bob"]);
  });
  it("rejects bad pseudo", async () => {
    const { app } = makeApp();
    const r = await request(app).post("/api/scores").send({ pseudo: "", score: 10 });
    expect(r.status).toBe(400);
  });
  it("returns total player count in rank response", async () => {
    const { app } = makeApp();
    await request(app).post("/api/scores").send({ pseudo: "alice", score: 100 });
    await request(app).post("/api/scores").send({ pseudo: "bob", score: 50 });
    const r = await request(app).post("/api/scores").send({ pseudo: "carol", score: 75 });
    expect(r.status).toBe(200);
    expect(r.body.rank).toBe(2);
    expect(r.body.total).toBe(3);
  });
});

describe("GET /api/solve", () => {
  it("returns solutions array for a known grid", async () => {
    const { app, cache } = makeApp();
    cache.set("solve-id", [
      { letter: "C", bonus: null }, { letter: "H", bonus: null },
      { letter: "A", bonus: null }, { letter: "T", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null },
    ]);
    const res = await request(app).get("/api/solve?gridId=solve-id");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.solutions)).toBe(true);
    const words = res.body.solutions.map((s) => s.word);
    expect(words).toContain("CHAT");
    res.body.solutions.forEach((s) => {
      expect(typeof s.word).toBe("string");
      expect(Array.isArray(s.path)).toBe(true);
      expect(typeof s.score).toBe("number");
    });
  });

  it("returns 400 GRID_MISSING for unknown gridId", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/solve?gridId=unknown");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("GRID_MISSING");
  });
});
