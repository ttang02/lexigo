/**
 * GameRoom Durable Object tests.
 * Runs inside the Workers runtime via @cloudflare/vitest-pool-workers.
 *
 * The R2 DICTIONARY binding is seeded once in beforeAll with a small known
 * word list so the dictionary loader (worker/src/dictionary.js) can build a Trie.
 *
 * Internal DO protocol (path-based; see worker/src/game-room.js):
 *   POST /grid                          → { gridId, cells }
 *   GET  /daily?date=YYYY-MM-DD         → { gridId, cells, daily, date }
 *   POST /validate { path, word }       → validate payloads
 *   POST /hint                          → hint payloads
 *   POST /solve                         → { solutions }
 *   POST /bots                          → { bots }
 *
 * The DO is addressed by gridId via env.GAME.idFromName(gridId).
 */
import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll, inject } from "vitest";

// Seed R2 with the REAL dictionary so random grids reliably contain words.
// The text is read from disk by tests/setup-game.js (Node side) and injected,
// because the workers test pool can't `?raw`-import files.
beforeAll(async () => {
  await env.DICTIONARY.put("dict.txt", inject("dictText"));
});

// Helper: address a GameRoom DO by gridId name and send a path-based request.
function stubFor(gridId) {
  const id = env.GAME.idFromName(gridId);
  return env.GAME.get(id);
}

async function callDO(gridId, path, { method = "POST", body } = {}) {
  const stub = stubFor(gridId);
  const init = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "content-type": "application/json" };
  }
  const res = await stub.fetch(`http://do${path}`, init);
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

// Create a grid in a fresh DO and return the { gridId, cells } payload.
// Each cell is { letter, bonus }.
async function createGrid(gridId) {
  const { status, json } = await callDO(gridId, "/grid");
  expect(status).toBe(200);
  return json;
}

// Create grids until one yields at least one solvable dictionary word, then
// return { gridId, cells, found:{ word, path, score } } for the first solution.
// Deriving the word from the DO's own /solve guarantees a valid word+path pair.
async function createSolvableGrid() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const gridId = `g-${crypto.randomUUID()}`;
    const { cells } = await createGrid(gridId);
    const { json } = await callDO(gridId, "/solve");
    const solutions = json.solutions;
    if (solutions && solutions.length > 0) {
      return { gridId, cells, found: solutions[0] };
    }
  }
  throw new Error("no solvable grid found in 50 attempts");
}

describe("GameRoom — server-authoritative dedup (headline)", () => {
  it("validating the same valid word twice increases the total only once", async () => {
    const { gridId, found } = await createSolvableGrid();

    const first = await callDO(gridId, "/validate", { body: { path: found.path, word: found.word } });
    expect(first.status).toBe(200);
    expect(first.json.valid).toBe(true);
    const totalAfterFirst = first.json.total;
    expect(totalAfterFirst).toBe(first.json.score);

    const second = await callDO(gridId, "/validate", { body: { path: found.path, word: found.word } });
    expect(second.status).toBe(200);
    expect(second.json.valid).toBe(true);
    // Dedup: same word counted once. Total must NOT increase.
    expect(second.json.total).toBe(totalAfterFirst);
  });
});

describe("GameRoom — grid expiry", () => {
  it("returns GRID_MISSING for operations on a grid that was never created", async () => {
    const gridId = `missing-${crypto.randomUUID()}`;
    for (const op of ["/validate", "/hint", "/solve", "/bots"]) {
      const body = op === "/validate" ? { path: [0, 1], word: "AB" } : {};
      const { status, json } = await callDO(gridId, op, { body });
      expect(status, `${op} should be 400`).toBe(400);
      expect(json).toEqual({ error: "grid expired or unknown", code: "GRID_MISSING" });
    }
  });
});

describe("GameRoom — validate error codes", () => {
  it("rejects an invalid (non-adjacent / too-short) path with PATH_INVALID", async () => {
    const gridId = `pi-${crypto.randomUUID()}`;
    await createGrid(gridId);
    // Single-cell path is invalid (length < 2).
    const { status, json } = await callDO(gridId, "/validate", { body: { path: [0], word: "X" } });
    expect(status).toBe(400);
    expect(json).toEqual({ error: "invalid path", code: "PATH_INVALID" });
  });

  it("rejects when the word does not match the path with WORD_MISMATCH", async () => {
    const gridId = `wm-${crypto.randomUUID()}`;
    await createGrid(gridId);
    // [0,1] are adjacent (top row); claim a word that won't match the letters.
    const { status, json } = await callDO(gridId, "/validate", {
      body: { path: [0, 1], word: "ZZ" },
    });
    expect(status).toBe(400);
    expect(json).toEqual({ error: "word does not match path", code: "WORD_MISMATCH" });
  });

  it("returns valid:false for a valid path whose word is not in the dictionary", async () => {
    // Build a grid, then find a valid adjacent pair whose 2-letter word is NOT
    // a dictionary solution — guaranteeing the not-in-dictionary branch.
    const COLS = 4;
    const adjacent = (a, b) => {
      const ar = Math.floor(a / COLS), ac = a % COLS;
      const br = Math.floor(b / COLS), bc = b % COLS;
      return a !== b && Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1;
    };
    let result = null;
    for (let attempt = 0; attempt < 50 && !result; attempt++) {
      const gridId = `nd-${crypto.randomUUID()}`;
      const { cells } = await createGrid(gridId);
      const { json: solveJson } = await callDO(gridId, "/solve");
      const words = new Set((solveJson.solutions || []).map((s) => s.word));
      for (let a = 0; a < 16 && !result; a++) {
        for (let b = 0; b < 16; b++) {
          if (!adjacent(a, b)) continue;
          const word = cells[a].letter + cells[b].letter;
          if (words.has(word)) continue; // would be valid:true
          const { json } = await callDO(gridId, "/validate", { body: { path: [a, b], word } });
          if (json.valid === false) {
            result = json;
            break;
          }
        }
      }
    }
    expect(result, "expected a valid path that is not a dictionary word").toBeTruthy();
    expect(result).toEqual({ valid: false, score: 0, reason: "not in dictionary" });
  });

  it("normalizes the supplied word before comparing to the path", async () => {
    const { gridId, found } = await createSolvableGrid();
    // Lower-case + accents should normalize to the same derived word.
    const decorated = found.word.toLowerCase();
    const { status, json } = await callDO(gridId, "/validate", {
      body: { path: found.path, word: decorated },
    });
    expect(status).toBe(200);
    expect(json.valid).toBe(true);
  });
});

describe("GameRoom — hint", () => {
  it("returns SESSION_MISSING when no word has been validated yet", async () => {
    const gridId = `hs-${crypto.randomUUID()}`;
    await createGrid(gridId);
    const { status, json } = await callDO(gridId, "/hint");
    expect(status).toBe(400);
    expect(json).toEqual({ error: "no active session", code: "SESSION_MISSING" });
  });

  it("reveals an unfound word, costs 50, and deducts from the total", async () => {
    const { gridId, found } = await createSolvableGrid();
    const v = await callDO(gridId, "/validate", { body: { path: found.path, word: found.word } });
    const totalBefore = v.json.total;

    const { status, json } = await callDO(gridId, "/hint");
    expect(status).toBe(200);
    expect(json.cost).toBe(50);
    expect(typeof json.word).toBe("string");
    expect(Array.isArray(json.path)).toBe(true);
    expect(json.word).not.toBe(found.word); // an unfound word
    expect(json.total).toBe(Math.max(0, totalBefore - 50));
  });
});

describe("GameRoom — daily determinism", () => {
  it("returns the documented daily payload, deterministic per date", async () => {
    const date = "2026-06-26";
    const gridId = `daily-${date}`;
    // Address via the canonical name "daily-<date>"; query the date.
    const stub = env.GAME.get(env.GAME.idFromName(gridId));
    const resA = await stub.fetch(`http://do/daily?date=${date}`);
    const jsonA = await resA.json();
    expect(jsonA.daily).toBe(true);
    expect(jsonA.date).toBe(date);
    expect(jsonA.gridId).toBe(gridId);
    expect(Array.isArray(jsonA.cells)).toBe(true);
    expect(jsonA.cells).toHaveLength(16);

    // A different DO addressed by the same name (seed = 20260626) must match.
    const stub2 = env.GAME.get(env.GAME.idFromName(`${gridId}-check`));
    const resB = await stub2.fetch(`http://do/daily?date=${date}`);
    const jsonB = await resB.json();
    const letters = (c) => c.map((x) => x.letter).join("");
    expect(letters(jsonB.cells)).toBe(letters(jsonA.cells));
  });
});

describe("GameRoom — solve & bots shapes", () => {
  it("solve returns { solutions: [{ word, path, score }] }", async () => {
    const { gridId } = await createSolvableGrid();
    const { status, json } = await callDO(gridId, "/solve");
    expect(status).toBe(200);
    expect(Array.isArray(json.solutions)).toBe(true);
    expect(json.solutions.length).toBeGreaterThan(0);
    const s = json.solutions[0];
    expect(s).toHaveProperty("word");
    expect(s).toHaveProperty("path");
    expect(s).toHaveProperty("score");
  });

  it("bots returns { bots: [...] } with per-bot timelines", async () => {
    const { gridId } = await createSolvableGrid();
    const { status, json } = await callDO(gridId, "/bots");
    expect(status).toBe(200);
    expect(Array.isArray(json.bots)).toBe(true);
    expect(json.bots.length).toBeGreaterThan(0);
    const b = json.bots[0];
    expect(b).toHaveProperty("id");
    expect(b).toHaveProperty("timeline");
    expect(Array.isArray(b.timeline)).toBe(true);
  });
});
