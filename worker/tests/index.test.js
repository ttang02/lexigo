/**
 * Worker router integration tests.
 * Drives the whole worker via `SELF` from cloudflare:test (all bindings live:
 * DB/D1, DICTIONARY/R2, GAME/ROOM/LEADERBOARD Durable Objects, ASSETS).
 *
 * These are the headline route tests for Task 5:
 *   - GET  /api/grid                 → returns a fresh grid { gridId, cells, seed? }
 *   - GET/POST /api/scores           → leaderboard read + authoritative write round-trip
 *   - GET  /api/scores/live (Upgrade)→ 101 WebSocket from the Leaderboard DO
 *   - non-/api/* path                → SPA assets fallback
 */
import { env, SELF, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll, inject } from "vitest";

// Seed D1 migrations and the R2 dictionary once, mirroring the DO test suites.
beforeAll(async () => {
  await applyD1Migrations(env.DB, inject("d1Migrations"));
  await env.DICTIONARY.put("dict.txt", inject("dictText"));
});

const ORIGIN = "https://lexigo.test";

// Helper: hit the worker via SELF and return { status, json }.
async function api(path, { method = "GET", body, headers } = {}) {
  const init = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["content-type"] = "application/json";
  }
  const res = await SELF.fetch(`${ORIGIN}${path}`, init);
  const json = await res.json().catch(() => null);
  return { res, status: res.status, json };
}

describe("GET /api/grid", () => {
  it("returns a fresh grid with a gridId and 16 cells", async () => {
    const { status, json } = await api("/api/grid");
    expect(status).toBe(200);
    expect(typeof json.gridId).toBe("string");
    expect(Array.isArray(json.cells)).toBe(true);
    expect(json.cells).toHaveLength(16);
  });
});

describe("/api/scores round-trip", () => {
  it("GET returns an array; POST writes the session total and ranks the player", async () => {
    // Empty (or seeded) read first — must be an array.
    const list = await api("/api/scores?mode=normal&limit=5");
    expect(list.status).toBe(200);
    expect(Array.isArray(list.json)).toBe(true);

    // Create a grid + validate a real word so the session has a non-zero total.
    const grid = await api("/api/grid");
    const gridId = grid.json.gridId;
    const solve = await api(`/api/solve?gridId=${gridId}`);
    const solutions = solve.json.solutions || [];
    expect(solutions.length).toBeGreaterThan(0);
    const found = solutions[0];
    const v = await api("/api/validate", {
      method: "POST",
      body: { gridId, path: found.path, word: found.word },
    });
    expect(v.status).toBe(200);
    expect(v.json.valid).toBe(true);

    // Submit the score; the worker reads the authoritative session total.
    const pseudo = `Tester_${Math.random().toString(36).slice(2, 8)}`;
    const post = await api("/api/scores", {
      method: "POST",
      body: { pseudo, gridId, mode: "normal" },
    });
    expect(post.status).toBe(200);
    expect(post.json.ok).toBe(true);
    expect(post.json.score).toBe(v.json.total);
    expect(post.json.rank).toBeGreaterThanOrEqual(1);
    expect(post.json.total).toBeGreaterThanOrEqual(1);

    // The score is now readable in the leaderboard.
    const after = await api("/api/scores?mode=normal&limit=100");
    expect(after.json.some((r) => r.pseudo === pseudo)).toBe(true);
  });

  it("rejects an invalid pseudo with PSEUDO_INVALID", async () => {
    const { status, json } = await api("/api/scores", {
      method: "POST",
      body: { pseudo: "!!!", gridId: "whatever", mode: "normal" },
    });
    expect(status).toBe(400);
    expect(json).toEqual({ error: "invalid pseudo", code: "PSEUDO_INVALID" });
  });

  it("returns SESSION_MISSING when the grid has no play session", async () => {
    const { status, json } = await api("/api/scores", {
      method: "POST",
      body: { pseudo: "ValidName", gridId: `ghost-${crypto.randomUUID()}`, mode: "normal" },
    });
    expect(status).toBe(400);
    expect(json.code).toBe("SESSION_MISSING");
  });
});

describe("WebSocket upgrade endpoints", () => {
  it("GET /api/scores/live returns 101 and a WebSocket", async () => {
    const res = await SELF.fetch(`${ORIGIN}/api/scores/live?mode=normal`, {
      headers: { Upgrade: "websocket" },
    });
    expect(res.status).toBe(101);
    expect(res.webSocket).toBeTruthy();
    res.webSocket.accept();
    res.webSocket.close();
  });
});

describe("SPA assets fallback", () => {
  it("serves assets (not a 404 JSON API error) for a non-/api path", async () => {
    const res = await SELF.fetch(`${ORIGIN}/some/spa/route`);
    // The ASSETS binding handles it; it must NOT be routed as an API call.
    // In the test pool there may be no built client, so we only assert the
    // response did not come back as our JSON API "unknown route" shape.
    const ct = res.headers.get("content-type") || "";
    expect(ct.includes("application/json")).toBe(false);
  });
});

describe("CORS", () => {
  it("answers an OPTIONS preflight for /api with permissive headers", async () => {
    const res = await SELF.fetch(`${ORIGIN}/api/grid`, {
      method: "OPTIONS",
      headers: { Origin: "https://example.com" },
    });
    expect([200, 204]).toContain(res.status);
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });
});
