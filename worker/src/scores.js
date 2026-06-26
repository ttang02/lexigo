/**
 * D1 data-access layer for the per-mode leaderboard.
 *
 * Exports:
 *   upsertScore(db, { pseudo, score, mode, now }) → Promise<{ changed: boolean }>
 *   topScores(db, mode, limit)                    → Promise<Array<{ pseudo, score, updated_at }>>
 *   rankAndCount(db, pseudo, mode)                → Promise<{ rank: number|null, total: number }>
 *
 * Valid modes: "normal" | "bombe" | "daily"  (any other value normalises to "normal").
 * `now` is an injected timestamp (ms) — never call Date.now() here.
 */

const VALID_MODES = new Set(["normal", "bombe", "daily"]);

/** @param {string|undefined} mode */
function normMode(mode) {
  return VALID_MODES.has(mode) ? mode : "normal";
}

/**
 * Insert or conditionally update a score.
 * On conflict (pseudo, mode), only updates when the new score is STRICTLY greater.
 *
 * @param {D1Database} db
 * @param {{ pseudo: string, score: number, mode: string, now: number }} params
 * @returns {Promise<{ changed: boolean }>}
 */
export async function upsertScore(db, { pseudo, score, mode, now }) {
  const m = normMode(mode);
  const result = await db
    .prepare(
      `INSERT INTO scores (pseudo, mode, score, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(pseudo, mode) DO UPDATE SET
         score      = excluded.score,
         updated_at = excluded.updated_at
       WHERE excluded.score > scores.score`
    )
    .bind(pseudo, m, score, now)
    .run();

  return { changed: result.meta.changes > 0 };
}

/**
 * Return the top-N scores for a mode, ordered by score DESC then updated_at ASC.
 *
 * @param {D1Database} db
 * @param {string} mode
 * @param {number} limit
 * @returns {Promise<Array<{ pseudo: string, score: number, updated_at: number }>>}
 */
export async function topScores(db, mode, limit) {
  const m = normMode(mode);
  const { results } = await db
    .prepare(
      "SELECT pseudo, score, updated_at FROM scores WHERE mode = ? ORDER BY score DESC, updated_at ASC LIMIT ?"
    )
    .bind(m, limit)
    .all();
  return results;
}

/**
 * Return the rank and total player count for a given pseudo+mode.
 * rank  = (# of scores strictly greater than this pseudo's score) + 1
 * rank  = null if the pseudo has no score in this mode
 * total = total number of scores in this mode
 *
 * @param {D1Database} db
 * @param {string} pseudo
 * @param {string} mode
 * @returns {Promise<{ rank: number|null, total: number }>}
 */
export async function rankAndCount(db, pseudo, mode) {
  const m = normMode(mode);

  const [existsRow, totalRow] = await Promise.all([
    db
      .prepare("SELECT score FROM scores WHERE pseudo = ? AND mode = ?")
      .bind(pseudo, m)
      .first(),
    db
      .prepare("SELECT COUNT(*) AS total FROM scores WHERE mode = ?")
      .bind(m)
      .first(),
  ]);

  const total = totalRow?.total ?? 0;

  if (!existsRow) {
    return { rank: null, total };
  }

  const rankRow = await db
    .prepare(
      `SELECT COUNT(*) + 1 AS rank FROM scores
       WHERE mode = ? AND score > (SELECT score FROM scores WHERE pseudo = ? AND mode = ?)`
    )
    .bind(m, pseudo, m)
    .first();

  return { rank: rankRow?.rank ?? 1, total };
}
