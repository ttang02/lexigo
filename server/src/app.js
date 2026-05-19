import express from "express";
import cors from "cors";
import { generateGrid } from "./grid.js";
import { isPathValid, wordFromPath } from "./validate.js";
import { computeScore } from "./score.js";
import { solve } from "./solver.js";

const PSEUDO_RE = /^[A-Za-z0-9_\- ]{1,20}$/;

export function buildApp({ trie, db, cache, normalize }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "16kb" }));

  app.get("/api/solve", (req, res) => {
    const { gridId } = req.query;
    const cells = cache.get(gridId);
    if (!cells) return res.status(400).json({ error: "grid expired or unknown", code: "GRID_MISSING" });
    const solutions = solve({ cells, trie });
    res.json({ solutions });
  });

  app.get("/api/grid", (_req, res) => {
    const grid = generateGrid();
    cache.set(grid.gridId, grid.cells);
    res.json(grid);
  });

  app.get("/api/solve", (req, res) => {
    const { gridId } = req.query;
    const cells = cache.get(gridId);
    if (!cells) return res.status(400).json({ error: "grid expired or unknown", code: "GRID_MISSING" });
    const solutions = solve({ cells, trie });
    res.json({ solutions });
  });

  app.post("/api/validate", (req, res) => {
    const { gridId, path, word } = req.body || {};
    const cells = cache.get(gridId);
    if (!cells) return res.status(400).json({ error: "grid expired or unknown", code: "GRID_MISSING" });
    if (!isPathValid(path, cells)) return res.status(400).json({ error: "invalid path", code: "PATH_INVALID" });
    const derived = wordFromPath(path, cells);
    const normalizedWord = typeof word === "string" ? normalize(word) : "";
    if (derived !== normalizedWord) return res.status(400).json({ error: "word does not match path", code: "WORD_MISMATCH" });
    if (!trie.hasWord(derived)) return res.json({ valid: false, score: 0, reason: "not in dictionary" });
    const score = computeScore({ path, cells });
    res.json({ valid: true, score });
  });

  app.post("/api/scores", (req, res) => {
    const { pseudo, score } = req.body || {};
    const cleanPseudo = typeof pseudo === "string" ? pseudo.trim() : "";
    if (!PSEUDO_RE.test(cleanPseudo)) return res.status(400).json({ error: "invalid pseudo", code: "PSEUDO_INVALID" });
    if (!Number.isInteger(score) || score < 0 || score > 100_000) return res.status(400).json({ error: "invalid score", code: "SCORE_INVALID" });
    db.upsertScore({ pseudo: cleanPseudo, score });
    const rank = db.rankOf(cleanPseudo);
    const total = db.countScores();
    res.json({ ok: true, rank, total });
  });

  app.get("/api/scores", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    res.json(db.topScores(limit));
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "internal error", code: "INTERNAL" });
  });

  return app;
}
