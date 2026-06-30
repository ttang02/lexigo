-- Per-mode leaderboard scores (normal, bombe, daily)
-- Keyed by (pseudo, mode) so each player has one score per game mode.
CREATE TABLE IF NOT EXISTS scores (
  pseudo TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'normal',
  score INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (pseudo, mode)
);
CREATE INDEX IF NOT EXISTS idx_scores_mode_score ON scores (mode, score DESC, updated_at ASC);
