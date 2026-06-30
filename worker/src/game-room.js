/**
 * GameRoom — the authoritative Durable Object for a single game grid.
 *
 * One DO instance == one grid, addressed by gridId via env.GAME.idFromName(gridId).
 * It replaces, for that grid, the Express server's in-memory GridCache +
 * SolveCache + PlaySessionStore: it owns the grid cells, the lazily-computed
 * solution set, and the server-authoritative running score (each validated
 * word counts exactly once per grid — the dedup the headline test checks).
 *
 * ─── Internal protocol (consumed by the Worker router in Task 5) ───
 * The DO's fetch accepts path-based requests; its JSON responses ARE the
 * existing public payloads:
 *
 *   POST /grid
 *     → 200 { gridId, cells }
 *     Creates (or replaces) this DO's grid. gridId is the DO's name, passed in
 *     via the `x-grid-id` header (the router sets it; tests too).
 *
 *   GET|POST /daily?date=YYYY-MM-DD   (date also accepted in the JSON body)
 *     → 200 { gridId, cells, daily: true, date }
 *     Deterministic: seed = Number(date.replace(/-/g,"")), gridId = daily-<date>.
 *     The DO must be addressed by name "daily-<date>".
 *
 *   POST /validate   body { path, word }
 *     → 400 { error:"grid expired or unknown", code:"GRID_MISSING" }   (no/expired grid)
 *     → 400 { error:"invalid path", code:"PATH_INVALID" }
 *     → 400 { error:"word does not match path", code:"WORD_MISMATCH" }
 *     → 200 { valid:false, score:0, reason:"not in dictionary" }
 *     → 200 { valid:true, score, total }                              (total dedup'd)
 *
 *   POST /hint
 *     → 400 GRID_MISSING / SESSION_MISSING / NO_HINT
 *     → 200 { word, path, cost:50, total }
 *
 *   POST /solve
 *     → 400 GRID_MISSING
 *     → 200 { solutions }
 *
 *   POST /bots
 *     → 400 GRID_MISSING
 *     → 200 { bots }
 *
 * Storage: a single key "game" → { cells, createdAt, total, words, solutions }.
 *   - words:     array (Sets don't serialize) of normalized found words.
 *   - solutions: null until the first solve/bots/hint computes & caches it.
 * Entries older than TTL are treated as missing (GRID_MISSING).
 */
import { generateGrid } from "../../server/src/grid.js";
import { isPathValid, wordFromPath } from "../../server/src/validate.js";
import { computeScore } from "../../server/src/score.js";
import { solve } from "../../server/src/solver.js";
import { buildBots } from "../../server/src/bots.js";
import { normalize } from "../../server/src/dict.js";
import { getTrie } from "./dictionary.js";

// One TTL for grid expiry == the legacy PlaySessionStore TTL (30 min), so a
// score submission survives well past the 2-min game.
const TTL_MS = 1_800_000;
const HINT_COST = 50;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const err = (error, code, status = 400) => json({ error, code }, status);

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  // Load the stored game entry, or null if absent/expired.
  async _entry() {
    const entry = await this.state.storage.get("game");
    if (!entry) return null;
    if (Date.now() - entry.createdAt > TTL_MS) return null;
    return entry;
  }

  async _put(entry) {
    await this.state.storage.put("game", entry);
  }

  // Lazily compute + cache the solution set for the stored grid.
  async _solutions(entry) {
    if (entry.solutions) return entry.solutions;
    const trie = await getTrie(this.env);
    const solutions = solve({ cells: entry.cells, trie });
    entry.solutions = solutions;
    await this._put(entry);
    return solutions;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    let body = {};
    if (request.method !== "GET") {
      body = await request.json().catch(() => ({}));
    }

    try {
      switch (path) {
        case "/grid":
          return this._opGrid(request);
        case "/daily":
          return this._opDaily(request, url, body);
        case "/total":
          return this._opTotal();
        case "/cells":
          return this._opCells(request);
        case "/validate":
          return this._opValidate(body);
        case "/hint":
          return this._opHint();
        case "/solve":
          return this._opSolve();
        case "/bots":
          return this._opBots();
        default:
          return err("unknown operation", "UNKNOWN_OP", 404);
      }
    } catch (e) {
      // Mirror the Express error handler's shape.
      console.error(e);
      return json({ error: "internal error", code: "INTERNAL" }, 500);
    }
  }

  // POST /grid — create/replace this DO's random grid.
  async _opGrid(request) {
    const grid = generateGrid();
    // The router addresses this DO by gridId and passes it via x-grid-id; fall
    // back to the freshly generated id so the returned id always matches cells.
    const gridId = request.headers.get("x-grid-id") || grid.gridId;
    await this._put({ cells: grid.cells, createdAt: Date.now(), total: 0, words: [], solutions: null });
    return json({ gridId, cells: grid.cells });
  }

  // GET|POST /daily — deterministic grid for a given calendar day.
  async _opDaily(request, url, body) {
    const date = url.searchParams.get("date") || body.date;
    if (!date) return err("missing date", "DATE_MISSING");
    const gridId = `daily-${date}`;
    let entry = await this._entry();
    if (!entry) {
      const seed = Number(date.replace(/-/g, ""));
      const { cells } = generateGrid({ seed });
      entry = { cells, createdAt: Date.now(), total: 0, words: [], solutions: null };
      await this._put(entry);
    }
    return json({ gridId, cells: entry.cells, daily: true, date });
  }

  // POST /total — read the authoritative session total WITHOUT mutating.
  // Used by the score-submission route. Absent/expired entry → SESSION_MISSING.
  async _opTotal() {
    const entry = await this._entry();
    if (!entry) return err("no active play session for grid", "SESSION_MISSING");
    return json({ total: entry.total });
  }

  // POST /cells — return this grid's cells from storage WITHOUT mutating.
  // Used to hand a room's grid to clients. Absent/expired → GRID_MISSING.
  async _opCells(request) {
    const entry = await this._entry();
    if (!entry) return err("grid expired or unknown", "GRID_MISSING");
    const gridId = request.headers.get("x-grid-id") || null;
    return json({ gridId, cells: entry.cells });
  }

  // POST /validate — server-authoritative scoring with per-grid dedup.
  async _opValidate(body) {
    const entry = await this._entry();
    if (!entry) return err("grid expired or unknown", "GRID_MISSING");
    const { path, word } = body;
    const cells = entry.cells;
    if (!isPathValid(path, cells)) return err("invalid path", "PATH_INVALID");
    const derived = wordFromPath(path, cells);
    const normalizedWord = typeof word === "string" ? normalize(word) : "";
    if (derived !== normalizedWord) return err("word does not match path", "WORD_MISMATCH");
    const trie = await getTrie(this.env);
    if (!trie.hasWord(derived)) return json({ valid: false, score: 0, reason: "not in dictionary" });
    const score = computeScore({ path, cells });
    // Count each word once per grid (server owns the running total).
    if (!entry.words.includes(derived)) {
      entry.words.push(derived);
      entry.total += score;
      await this._put(entry);
    }
    return json({ valid: true, score, total: entry.total });
  }

  // POST /hint — reveal one unfound word, deduct HINT_COST (clamped at 0).
  async _opHint() {
    const entry = await this._entry();
    if (!entry) return err("grid expired or unknown", "GRID_MISSING");
    // Legacy semantics: a play session exists only once at least one word has
    // been validated (the server's PlaySessionStore is created on the first
    // addWord). Until then, hint reports SESSION_MISSING.
    if (entry.words.length === 0) return err("no active session", "SESSION_MISSING");
    const solutions = await this._solutions(entry);
    const found = new Set(entry.words);
    const unfound = solutions.filter((s) => !found.has(s.word));
    if (unfound.length === 0) return err("no unfound words", "NO_HINT");
    const pick = unfound[Math.floor(Math.random() * unfound.length)];
    entry.total = Math.max(0, entry.total - HINT_COST);
    await this._put(entry);
    return json({ word: pick.word, path: pick.path, cost: HINT_COST, total: entry.total });
  }

  // POST /solve — full solution set (cached after first compute).
  async _opSolve() {
    const entry = await this._entry();
    if (!entry) return err("grid expired or unknown", "GRID_MISSING");
    const solutions = await this._solutions(entry);
    return json({ solutions });
  }

  // POST /bots — timed bot timelines derived from the solution set.
  async _opBots() {
    const entry = await this._entry();
    if (!entry) return err("grid expired or unknown", "GRID_MISSING");
    const solutions = await this._solutions(entry);
    return json({ bots: buildBots(solutions) });
  }
}
