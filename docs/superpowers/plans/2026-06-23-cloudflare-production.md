# Cloudflare Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run Lexigo entirely on Cloudflare Workers with persistent scores, authoritative games, and live 1v1 rooms.

**Architecture:** One Worker serves Vite assets and `/api/*`. D1 stores scores, R2 stores the private dictionary, and Durable Objects own short-lived game, room, and leaderboard-live state. WebSockets replace SSE broadcasts.

**Tech Stack:** Cloudflare Workers, Durable Objects, D1, WebSockets, React 18, Vite, Vitest, pnpm.

## Global Constraints

- Production code runs without Node compatibility mode.
- Existing request/response API payloads remain stable.
- A score is calculated and de-duplicated server-side per game.
- D1 is the only persistent user-facing data store; R2 holds the private dictionary.
- No Cloudflare account IDs, database IDs, tokens, or secrets are committed.

---

## File Structure

- `worker/src/index.js`: routing, assets fallback, bindings, and HTTP API.
- `worker/src/game-room.js`: game sessions, grids, solve cache, and validation.
- `worker/src/room.js`: 1v1 state and WebSocket fan-out.
- `worker/src/leaderboard.js`: shared leaderboard WebSocket fan-out.
- `worker/src/scores.js`: D1 queries.
- `worker/src/dictionary.js`: R2 dictionary and Trie bootstrap.
- `worker/tests/*.test.js`: Workers runtime tests.
- `migrations/0001_scores.sql`: D1 schema.
- `wrangler.jsonc`: Worker, assets, D1, and Durable Object bindings.

### Task 1: Add Cloudflare Tooling

**Files:** create `wrangler.jsonc`, `migrations/0001_scores.sql`; modify `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

- [ ] Write a failing config test that reads `wrangler.jsonc` and expects `ASSETS`, `DB`, `DICTIONARY`, `GAME`, `ROOM`, and `LEADERBOARD` bindings.
- [ ] Add `wrangler`, `@cloudflare/vitest-pool-workers`, and Worker package scripts.
- [ ] Create the D1 schema:

```sql
CREATE TABLE IF NOT EXISTS scores (
  pseudo TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'normal',
  score INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (pseudo, mode)
);
CREATE INDEX IF NOT EXISTS idx_scores_mode_score ON scores (mode, score DESC, updated_at ASC);
```

> Per-mode leaderboards (`normal`, `bombe`, `daily`) shipped after this plan was first written — the schema and queries below key scores by `(pseudo, mode)`.

- [ ] Configure an assets directory of `./client/dist`, D1 binding `DB`, R2 binding `DICTIONARY`, and Durable Object bindings `GAME`, `ROOM`, and `LEADERBOARD`. Use a placeholder database ID that users replace in their uncommitted local Wrangler config.
- [ ] Run `pnpm exec wrangler deploy --dry-run`; commit as `chore: configure Cloudflare Worker deployment`.

### Task 2: Move Scores to D1

**Files:** create `worker/src/scores.js`, `worker/tests/scores.test.js`.

**Interface:** `upsertScore(db, { pseudo, score, mode, now })`, `topScores(db, mode, limit)`, and `rankAndCount(db, pseudo, mode)` each return promises. Valid modes: `normal`, `bombe`, `daily` (default `normal`); each `/api/scores` read/write and the `/api/scores/live` WebSocket carry a `mode`.

- [ ] Write a failing Workers test that writes Ada's score, verifies a lower replacement is ignored, and checks leaderboard ordering/rank.
- [ ] Implement parameterized D1 statements. The top-score query is:

```js
const { results } = await db.prepare(
  "SELECT pseudo, score, updated_at FROM scores WHERE mode = ? ORDER BY score DESC, updated_at ASC LIMIT ?"
).bind(mode, limit).all();
```

- [ ] Run `pnpm --filter worker test -- scores.test.js`; commit as `feat: persist leaderboard scores in D1`.

### Task 3: Build the Authoritative Game Durable Object

**Files:** create `worker/src/game-room.js`, `worker/src/dictionary.js`, `worker/tests/game-room.test.js`; reuse pure game logic from `server/src/grid.js`, `server/src/validate.js`, `server/src/score.js`, `server/src/solver.js`, and `server/src/dict.js`.

**Interface:** `GameRoom.fetch(request)` receives game operation requests and responds with the existing JSON payloads.

- [ ] Write a failing test that validates the same word twice and asserts the server total changes only once.
- [ ] Load `dict.txt` from `env.DICTIONARY`, cache the constructed Trie per isolate, store `{ cells, createdAt, total, words, solutions }` in Durable Object storage, and reject expired grids.
- [ ] Implement grid, daily, validate, hint, solve, and bot operations; preserve existing error codes.
- [ ] Run `pnpm --filter worker test -- game-room.test.js`; commit as `feat: move authoritative games into Durable Objects`.

### Task 4: Move 1v1 Rooms and Live Updates to Durable Objects

**Files:** create `worker/src/room.js`, `worker/src/leaderboard.js`, `worker/tests/room.test.js`, `worker/tests/leaderboard.test.js`; modify `client/src/hooks/useLiveSSE.js` and `client/src/api.js`.

**Interface:** `/api/scores/live` and `/api/rooms/:code/live` upgrade to WebSocket and send JSON matching prior SSE data events.

- [ ] Write failing tests for join, two-player capacity, score broadcasts, and rematch reset.
- [ ] Use `WebSocketPair` plus `this.ctx.acceptWebSocket()` in room and leaderboard objects, serialize room state in object storage, and broadcast after every state change or D1 score update.
- [ ] Replace EventSource in `useLiveSSE` with a WebSocket retaining the existing 1-to-10 second reconnect backoff and callback contract.
- [ ] Run `pnpm --filter client test -- useLiveSSE` and `pnpm --filter worker test -- room.test.js`; commit as `feat: add live Durable Object rooms`.

### Task 5: Wire the Worker and Document Deployment

**Files:** create `worker/src/index.js`, `worker/package.json`, `worker/vitest.config.js`, `worker/tests/index.test.js`; modify `README.md`, `.env.example`, root scripts.

**Interface:** The Worker default export calls `env.ASSETS.fetch(request)` for non-API paths and routes all `/api/*` paths to D1 or Durable Objects.

- [ ] Write failing route tests for `/api/grid`, `/api/scores`, WebSocket upgrade endpoints, and SPA assets fallback.
- [ ] Implement the router, CORS behavior for development, validation, routing to named Durable Object IDs, and static assets fallback.
- [ ] Document `pnpm install`, `pnpm run cf:login`, `pnpm run cf:d1:create`, `pnpm run cf:r2:create`, copying the returned ID into the uncommitted local Wrangler config, `pnpm run cf:dictionary:upload`, `pnpm run cf:db:migrate:remote`, and `pnpm run deploy`.
- [ ] Run `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm exec wrangler deploy --dry-run`; commit as `feat: deploy Lexigo on Cloudflare`.
