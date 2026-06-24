import express from "express";
import cors from "cors";
import { generateGrid } from "./grid.js";
import { isPathValid, wordFromPath } from "./validate.js";
import { computeScore } from "./score.js";
import { solve } from "./solver.js";
import { buildBots } from "./bots.js";
import { SolveCache, PlaySessionStore } from "./gridCache.js";
import { createRateLimiter } from "./rateLimit.js";
import { RoomStore } from "./rooms.js";

// At least one alphanumeric; only alnum, space, underscore, hyphen; 1-20 chars.
const PSEUDO_RE = /^(?=.*[A-Za-z0-9])[A-Za-z0-9_\- ]{1,20}$/;
const SCORE_MODES = new Set(["normal", "bombe", "daily"]);

function buildCorsOptions() {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || raw === "*") return { origin: true };
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return { origin: list };
}

export function buildApp({
  trie,
  db,
  cache,
  normalize,
  solveCache = new SolveCache(),
  sessions = new PlaySessionStore(),
}) {
  const app = express();
  const trustProxy = Number(process.env.TRUST_PROXY) || 0;
  if (trustProxy > 0) app.set("trust proxy", trustProxy);
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: "16kb" }));

  // Per-route rate limits. Each limiter has its own store (per-IP fixed window).
  const globalLimiter = createRateLimiter({ windowMs: 60_000, max: 120 });
  const gridLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });
  const solveLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
  const botsLimiter = createRateLimiter({ windowMs: 60_000, max: 15 });
  const validateLimiter = createRateLimiter({ windowMs: 60_000, max: 240 });
  const scoreWriteLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
  const scoreReadLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });
  const hintLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
  app.use("/api/", globalLimiter);

  app.get("/api/grid", gridLimiter, (_req, res) => {
    const grid = generateGrid();
    cache.set(grid.gridId, grid.cells);
    res.json(grid);
  });

  // Daily challenge — same grid for all players each calendar day.
  // Seed = YYYYMMDD integer → deterministic mulberry32 grid.
  let _daily = null; // { date, gridId, cells }
  const dailyLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });
  app.get("/api/daily", dailyLimiter, (_req, res) => {
    const today = new Date().toISOString().slice(0, 10); // "2026-06-07"
    if (!_daily || _daily.date !== today) {
      const seed = Number(today.replace(/-/g, "")); // 20260607
      const { cells } = generateGrid({ seed });
      _daily = { date: today, gridId: `daily-${today}`, cells };
    }
    // Refresh in main cache so validate/bots/solve routes can access it.
    cache.set(_daily.gridId, _daily.cells);
    res.json({ gridId: _daily.gridId, cells: _daily.cells, daily: true, date: today });
  });

  app.get("/api/solve", solveLimiter, (req, res) => {
    const { gridId } = req.query;
    const cells = cache.get(gridId);
    if (!cells) {
      solveCache.delete(gridId); // sync eviction on grid TTL expiry
      return res.status(400).json({ error: "grid expired or unknown", code: "GRID_MISSING" });
    }
    const cached = solveCache.get(gridId);
    if (cached) return res.json({ solutions: cached });
    const solutions = solve({ cells, trie });
    solveCache.set(gridId, solutions);
    res.json({ solutions });
  });

  app.get("/api/bots", botsLimiter, (req, res) => {
    const { gridId } = req.query;
    const cells = cache.get(gridId);
    if (!cells) return res.status(400).json({ error: "grid expired or unknown", code: "GRID_MISSING" });
    let solutions = solveCache.get(gridId);
    if (!solutions) {
      solutions = solve({ cells, trie });
      solveCache.set(gridId, solutions);
    }
    res.json({ bots: buildBots(solutions) });
  });

  // POST /api/hint — reveal one unfound word, deduct HINT_COST from session.
  const HINT_COST = 50;
  app.post("/api/hint", hintLimiter, (req, res) => {
    const { gridId } = req.body || {};
    const cells = cache.get(gridId);
    if (!cells) return res.status(400).json({ error: "grid expired or unknown", code: "GRID_MISSING" });
    const total = sessions.totalOf(gridId);
    if (total === null) return res.status(400).json({ error: "no active session", code: "SESSION_MISSING" });
    let solutions = solveCache.get(gridId);
    if (!solutions) {
      solutions = solve({ cells, trie });
      solveCache.set(gridId, solutions);
    }
    const found = sessions.foundWords(gridId);
    const unfound = solutions.filter((s) => !found.has(s.word));
    if (unfound.length === 0) return res.status(400).json({ error: "no unfound words", code: "NO_HINT" });
    const pick = unfound[Math.floor(Math.random() * unfound.length)];
    const newTotal = sessions.penalize(gridId, HINT_COST);
    res.json({ word: pick.word, path: pick.path, cost: HINT_COST, total: newTotal });
  });

  app.post("/api/validate", validateLimiter, (req, res) => {
    const { gridId, path, word } = req.body || {};
    const cells = cache.get(gridId);
    if (!cells) return res.status(400).json({ error: "grid expired or unknown", code: "GRID_MISSING" });
    if (!isPathValid(path, cells)) return res.status(400).json({ error: "invalid path", code: "PATH_INVALID" });
    const derived = wordFromPath(path, cells);
    const normalizedWord = typeof word === "string" ? normalize(word) : "";
    if (derived !== normalizedWord) return res.status(400).json({ error: "word does not match path", code: "WORD_MISMATCH" });
    if (!trie.hasWord(derived)) return res.json({ valid: false, score: 0, reason: "not in dictionary" });
    const score = computeScore({ path, cells });
    // Server owns the running total; counted once per word per grid.
    const total = sessions.addWord(gridId, derived, score);
    res.json({ valid: true, score, total });
  });

  // SSE live leaderboard — per-mode broadcast on each score submission.
  const liveClients = new Map(); // mode -> Set<res>
  function broadcastLeaderboard(mode) {
    const set = liveClients.get(mode);
    if (!set || set.size === 0) return;
    const payload = `data: ${JSON.stringify(db.topScores(mode, 20))}\n\n`;
    for (const client of set) {
      try { client.write(payload); } catch { set.delete(client); }
    }
  }

  app.get("/api/scores/live", scoreReadLimiter, (req, res) => {
    const mode = SCORE_MODES.has(req.query.mode) ? req.query.mode : "normal";
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    // Send current state immediately
    res.write(`data: ${JSON.stringify(db.topScores(mode, 20))}\n\n`);
    let set = liveClients.get(mode);
    if (!set) { set = new Set(); liveClients.set(mode, set); }
    set.add(res);
    req.on("close", () => set.delete(res));
  });

  app.post("/api/scores", scoreWriteLimiter, (req, res) => {
    const { pseudo, gridId, mode } = req.body || {};
    const cleanPseudo = typeof pseudo === "string" ? pseudo.trim().replace(/\s+/g, " ") : "";
    if (!PSEUDO_RE.test(cleanPseudo)) return res.status(400).json({ error: "invalid pseudo", code: "PSEUDO_INVALID" });
    const m = SCORE_MODES.has(mode) ? mode : "normal";
    // Score is authoritative from the server-side play session, not the client.
    const score = sessions.totalOf(gridId);
    if (score === null) return res.status(400).json({ error: "no active play session for grid", code: "SESSION_MISSING" });
    db.upsertScore({ pseudo: cleanPseudo, score, mode: m });
    const rank = db.rankOf(cleanPseudo, m);
    const total = db.countScores(m);
    broadcastLeaderboard(m); // push update to this mode's live watchers
    res.json({ ok: true, score, rank, total });
  });

  app.get("/api/scores", scoreReadLimiter, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const mode = SCORE_MODES.has(req.query.mode) ? req.query.mode : "normal";
    res.json(db.topScores(mode, limit));
  });

  // ─── 1v1 Rooms ───────────────────────────────────────────────
  const rooms = new RoomStore();
  const roomLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

  // Create room (host)
  app.post("/api/rooms", roomLimiter, (_req, res) => {
    const grid = generateGrid();
    cache.set(grid.gridId, grid.cells);
    const room = rooms.create({ gridId: grid.gridId });
    res.json({ code: room.code, gridId: grid.gridId, cells: grid.cells });
  });

  // Join room by code (guest or host rejoining)
  app.post("/api/rooms/join", roomLimiter, (req, res) => {
    const { code, pseudo } = req.body || {};
    const result = rooms.join(String(code || "").toUpperCase(), pseudo);
    if (!result) return res.status(400).json({ error: "Room not found or full", code: "ROOM_ERROR" });
    const { playerId, room } = result;
    const cells = cache.get(room.gridId);
    if (!cells) return res.status(400).json({ error: "Grid expired", code: "GRID_MISSING" });
    res.json({ code: room.code, gridId: room.gridId, cells, playerId });
  });

  // SSE — live room state (player scores)
  app.get("/api/rooms/:code/live", (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = rooms.get(code);
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(`data: ${JSON.stringify(rooms.publicState(room))}\n\n`);
    rooms.addClient(code, res);
    req.on("close", () => rooms.removeClient(code, res));
  });

  // Push live score update (called after each validated word)
  app.post("/api/rooms/:code/score", roomLimiter, (req, res) => {
    const code = req.params.code.toUpperCase();
    const { playerId, score } = req.body || {};
    const room = rooms.updateScore(code, playerId, Number(score) || 0);
    if (!room) return res.status(400).json({ error: "Invalid room or player", code: "ROOM_ERROR" });
    res.json({ ok: true });
  });

  // Fetch current grid cells for a room (used by the opponent after a rematch).
  app.get("/api/rooms/:code", roomLimiter, (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = rooms.get(code);
    if (!room) return res.status(404).json({ error: "Room not found", code: "ROOM_ERROR" });
    const cells = cache.get(room.gridId);
    if (!cells) return res.status(400).json({ error: "Grid expired", code: "GRID_MISSING" });
    res.json({ code: room.code, gridId: room.gridId, cells });
  });

  // Reset scores and assign a new grid for a rematch, keeping the same room/players.
  app.post("/api/rooms/:code/rematch", roomLimiter, (req, res) => {
    const code = req.params.code.toUpperCase();
    const grid = generateGrid();
    cache.set(grid.gridId, grid.cells);
    const room = rooms.rematch(code, grid.gridId);
    if (!room) return res.status(400).json({ error: "Invalid room", code: "ROOM_ERROR" });
    res.json({ gridId: grid.gridId, cells: grid.cells });
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "internal error", code: "INTERNAL" });
  });

  return app;
}
