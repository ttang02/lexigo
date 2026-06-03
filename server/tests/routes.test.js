import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { Trie, normalize } from "../src/dict.js";
import { createDb } from "../src/db.js";
import { GridCache, SolveCache, PlaySessionStore } from "../src/gridCache.js";

function makeApp() {
  const trie = new Trie();
  ["CHAT", "CHIEN", "ABAT"].forEach((w) => trie.insert(w));
  const db = createDb(":memory:");
  const cache = new GridCache({ ttlMs: 60_000 });
  const solveCache = new SolveCache();
  const sessions = new PlaySessionStore();
  return { app: buildApp({ trie, db, cache, normalize, solveCache, sessions }), db, cache, solveCache, sessions };
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
  it("validates a known word and accumulates server-side total", async () => {
    const res = await request(ctx.app).post("/api/validate").send({ gridId: "fixed-id", path: [0,1,2,3], word: "CHAT" });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.score).toBeGreaterThan(0);
    expect(res.body.total).toBe(res.body.score);
    expect(ctx.sessions.totalOf("fixed-id")).toBe(res.body.score);
  });
  it("counts the same word once per grid (no double scoring)", async () => {
    const r1 = await request(ctx.app).post("/api/validate").send({ gridId: "fixed-id", path: [0,1,2,3], word: "CHAT" });
    const r2 = await request(ctx.app).post("/api/validate").send({ gridId: "fixed-id", path: [0,1,2,3], word: "CHAT" });
    expect(r2.body.total).toBe(r1.body.total);
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
  it("submits the server-authoritative session total, not a client score", async () => {
    const { app, sessions } = makeApp();
    sessions.addWord("g-alice", "W", 100);
    const r1 = await request(app).post("/api/scores").send({ pseudo: "alice", gridId: "g-alice", score: 999999 });
    expect(r1.status).toBe(200);
    expect(r1.body.ok).toBe(true);
    expect(r1.body.score).toBe(100); // client-sent 999999 ignored
    expect(r1.body.rank).toBe(1);
    sessions.addWord("g-bob", "W", 50);
    await request(app).post("/api/scores").send({ pseudo: "bob", gridId: "g-bob" });
    const r2 = await request(app).get("/api/scores?limit=10");
    expect(r2.status).toBe(200);
    expect(r2.body.map((r) => r.pseudo)).toEqual(["alice", "bob"]);
  });
  it("rejects submission with no active session", async () => {
    const { app } = makeApp();
    const r = await request(app).post("/api/scores").send({ pseudo: "ghost", gridId: "nope" });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("SESSION_MISSING");
  });
  it("rejects empty pseudo", async () => {
    const { app, sessions } = makeApp();
    sessions.addWord("g", "W", 10);
    const r = await request(app).post("/api/scores").send({ pseudo: "", gridId: "g" });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("PSEUDO_INVALID");
  });
  it("rejects pseudo with no alphanumeric character", async () => {
    const { app, sessions } = makeApp();
    sessions.addWord("g", "W", 10);
    const r = await request(app).post("/api/scores").send({ pseudo: "_- _-", gridId: "g" });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("PSEUDO_INVALID");
  });
  it("returns total player count in rank response", async () => {
    const { app, sessions } = makeApp();
    sessions.addWord("g1", "W", 100);
    sessions.addWord("g2", "W", 50);
    sessions.addWord("g3", "W", 75);
    await request(app).post("/api/scores").send({ pseudo: "alice", gridId: "g1" });
    await request(app).post("/api/scores").send({ pseudo: "bob", gridId: "g2" });
    const r = await request(app).post("/api/scores").send({ pseudo: "carol", gridId: "g3" });
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

  it("memoizes solutions via SolveCache (second call hits cache)", async () => {
    const { app, cache, solveCache } = makeApp();
    cache.set("memo-id", Array.from({ length: 16 }, (_, i) => ({ letter: i < 4 ? "CHAT"[i] : "X", bonus: null })));
    const r1 = await request(app).get("/api/solve?gridId=memo-id");
    expect(r1.status).toBe(200);
    expect(solveCache.get("memo-id")).not.toBeNull();
    // tamper with cache to prove the second call reads from solveCache, not solver
    solveCache.set("memo-id", [{ word: "SENTINEL", path: [0], score: 999 }]);
    const r2 = await request(app).get("/api/solve?gridId=memo-id");
    expect(r2.status).toBe(200);
    expect(r2.body.solutions).toEqual([{ word: "SENTINEL", path: [0], score: 999 }]);
  });

  it("evicts solveCache entry when grid TTL expires", async () => {
    const { app, cache, solveCache } = makeApp();
    cache.set("ttl-id", Array.from({ length: 16 }, () => ({ letter: "X", bonus: null })));
    await request(app).get("/api/solve?gridId=ttl-id");
    // simulate grid eviction
    cache.store.delete("ttl-id");
    expect(solveCache.get("ttl-id")).not.toBeNull();
    const res = await request(app).get("/api/solve?gridId=ttl-id");
    expect(res.status).toBe(400);
    expect(solveCache.get("ttl-id")).toBeNull();
  });
});

describe("POST /api/scores — pseudo normalization", () => {
  it("collapses internal whitespace", async () => {
    const { app, sessions } = makeApp();
    sessions.addWord("norm-id", "W", 42);
    const r = await request(app).post("/api/scores").send({ pseudo: "  ad   min  ", gridId: "norm-id" });
    expect(r.status).toBe(200);
    const list = await request(app).get("/api/scores");
    expect(list.body[0].pseudo).toBe("ad min");
  });
});
