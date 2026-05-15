import { describe, it, expect, beforeEach } from "vitest";
import { createDb } from "../src/db.js";

describe("scores DAO", () => {
  let db;
  beforeEach(() => { db = createDb(":memory:"); });

  it("inserts a new score", () => {
    const res = db.upsertScore({ pseudo: "alice", score: 100 });
    expect(res.changed).toBe(true);
    expect(db.topScores(10)).toEqual([
      { pseudo: "alice", score: 100, updated_at: expect.any(Number) },
    ]);
  });
  it("updates only if higher score", () => {
    db.upsertScore({ pseudo: "alice", score: 100 });
    const lower = db.upsertScore({ pseudo: "alice", score: 50 });
    expect(lower.changed).toBe(false);
    const higher = db.upsertScore({ pseudo: "alice", score: 200 });
    expect(higher.changed).toBe(true);
    expect(db.topScores(10)[0].score).toBe(200);
  });
  it("orders top scores descending and respects limit", () => {
    db.upsertScore({ pseudo: "a", score: 10 });
    db.upsertScore({ pseudo: "b", score: 50 });
    db.upsertScore({ pseudo: "c", score: 30 });
    const top = db.topScores(2);
    expect(top.map((r) => r.pseudo)).toEqual(["b", "c"]);
  });
  it("computes rank for a pseudo", () => {
    db.upsertScore({ pseudo: "a", score: 10 });
    db.upsertScore({ pseudo: "b", score: 50 });
    db.upsertScore({ pseudo: "c", score: 30 });
    expect(db.rankOf("b")).toBe(1);
    expect(db.rankOf("a")).toBe(3);
    expect(db.rankOf("none")).toBe(null);
  });
});
