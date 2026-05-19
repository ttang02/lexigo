import { DatabaseSync } from "node:sqlite";

export function createDb(path) {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      pseudo TEXT PRIMARY KEY,
      score INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores (score DESC);
  `);

  const upsertStmt = db.prepare(`
    INSERT INTO scores (pseudo, score, updated_at)
    VALUES (:pseudo, :score, :updated_at)
    ON CONFLICT(pseudo) DO UPDATE SET
      score = excluded.score,
      updated_at = excluded.updated_at
    WHERE excluded.score > scores.score
  `);
  const topStmt = db.prepare(`SELECT pseudo, score, updated_at FROM scores ORDER BY score DESC, updated_at ASC LIMIT ?`);
  const rankStmt = db.prepare(`
    SELECT COUNT(*) + 1 AS rank FROM scores
    WHERE score > (SELECT score FROM scores WHERE pseudo = ?)
  `);
  const existsStmt = db.prepare(`SELECT 1 FROM scores WHERE pseudo = ?`);
  const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM scores`);

  return {
    raw: db,
    upsertScore({ pseudo, score }) {
      const info = upsertStmt.run({ pseudo, score, updated_at: Date.now() });
      return { changed: info.changes > 0 };
    },
    topScores(limit = 20) {
      return topStmt.all(limit);
    },
    rankOf(pseudo) {
      if (!existsStmt.get(pseudo)) return null;
      return rankStmt.get(pseudo).rank;
    },
    countScores() {
      return countStmt.get().total;
    },
  };
}
