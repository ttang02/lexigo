import { DatabaseSync } from "node:sqlite";

const MODES = new Set(["normal", "bombe", "daily"]);
function normMode(mode) {
  return MODES.has(mode) ? mode : "normal";
}

export function createDb(path) {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      pseudo TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'normal',
      score INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (pseudo, mode)
    );
    CREATE INDEX IF NOT EXISTS idx_scores_mode_score ON scores (mode, score DESC);
  `);

  const upsertStmt = db.prepare(`
    INSERT INTO scores (pseudo, mode, score, updated_at)
    VALUES (:pseudo, :mode, :score, :updated_at)
    ON CONFLICT(pseudo, mode) DO UPDATE SET
      score = excluded.score,
      updated_at = excluded.updated_at
    WHERE excluded.score > scores.score
  `);
  const topStmt = db.prepare(`SELECT pseudo, score, updated_at FROM scores WHERE mode = ? ORDER BY score DESC, updated_at ASC LIMIT ?`);
  const rankStmt = db.prepare(`
    SELECT COUNT(*) + 1 AS rank FROM scores
    WHERE mode = :mode AND score > (SELECT score FROM scores WHERE pseudo = :pseudo AND mode = :mode)
  `);
  const existsStmt = db.prepare(`SELECT 1 FROM scores WHERE pseudo = :pseudo AND mode = :mode`);
  const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM scores WHERE mode = ?`);

  return {
    raw: db,
    upsertScore({ pseudo, score, mode }) {
      const m = normMode(mode);
      const info = upsertStmt.run({ pseudo, mode: m, score, updated_at: Date.now() });
      return { changed: info.changes > 0 };
    },
    topScores(mode = "normal", limit = 20) {
      return topStmt.all(normMode(mode), limit);
    },
    rankOf(pseudo, mode) {
      const m = normMode(mode);
      if (!existsStmt.get({ pseudo, mode: m })) return null;
      return rankStmt.get({ pseudo, mode: m }).rank;
    },
    countScores(mode = "normal") {
      return countStmt.get(normMode(mode)).total;
    },
  };
}
