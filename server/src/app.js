import express from "express";
import cors from "cors";
import { generateGrid } from "./grid.js";
import { isPathValid, wordFromPath } from "./validate.js";
import { computeScore } from "./score.js";
import { solve } from "./solver.js";
import { buildBots } from "./bots.js";
import { SolveCache, PlaySessionStore } from "./gridCache.js";
import { createRateLimiter } from "./rateLimit.js";

// At least one alphanumeric; only alnum, space, underscore, hyphen; 1-20 chars.
const PSEUDO_RE = /^(?=.*[A-Za-z0-9])[A-Za-z0-9_\- ]{1,20}$/;

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

  app.post("/api/scores", scoreWriteLimiter, (req, res) => {
    const { pseudo, gridId } = req.body || {};
    const cleanPseudo = typeof pseudo === "string" ? pseudo.trim().replace(/\s+/g, " ") : "";
    if (!PSEUDO_RE.test(cleanPseudo)) return res.status(400).json({ error: "invalid pseudo", code: "PSEUDO_INVALID" });
    // Score is authoritative from the server-side play session, not the client.
    const score = sessions.totalOf(gridId);
    if (score === null) return res.status(400).json({ error: "no active play session for grid", code: "SESSION_MISSING" });
    db.upsertScore({ pseudo: cleanPseudo, score });
    const rank = db.rankOf(cleanPseudo);
    const total = db.countScores();
    res.json({ ok: true, score, rank, total });
  });

  app.get("/api/scores", scoreReadLimiter, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    res.json(db.topScores(limit));
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "internal error", code: "INTERNAL" });
  });

  return app;
}
