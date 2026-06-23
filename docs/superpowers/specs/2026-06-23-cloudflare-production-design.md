# Lexigo on Cloudflare: Production Design

## Goal

Deploy the complete Lexigo application on Cloudflare without a separate Node
server. The production deployment must preserve server-authoritative scoring,
the persistent leaderboard, daily games, robot replay, and live 1v1 rooms.

## Architecture

The deployment is a single Cloudflare Worker with static assets. Wrangler
builds the React client, serves `client/dist` through the Worker assets binding,
and dispatches `/api/*` requests to the Worker API.

The Worker uses three Cloudflare services:

- **D1** stores leaderboard entries and replaces `scores.sqlite`.
- **Durable Objects** own all short-lived, mutable game state. Each game grid
  and each 1v1 room is routed to one authoritative object instance.
- **WebSockets** provide live leaderboard and room updates. They replace the
  existing Server-Sent Events endpoints because Durable Objects can own and
  broadcast persistent WebSocket connections safely.

The dictionary is bundled as a static text module and parsed into the existing
Trie implementation inside Worker isolates. The Worker runtime has no file
system access, no Express, and no `node:sqlite` dependency.

## API and State

Existing request/response endpoints remain under `/api/*`:

- Grid creation, validation, hints, solving, bots, daily grids, room creation,
  joining, scoring, and rematches retain their current payload contracts.
- The Worker validates input, applies rate limits, and forwards stateful work to
  the appropriate Durable Object.
- A game object holds the grid, solved-word cache, and server-authoritative
  score sessions for its configured TTL.
- A room object holds the current grid reference, player identities and scores,
  and resets state during a rematch. It broadcasts room changes to connected
  clients.
- D1 performs atomic best-score upserts and ranking queries. A leaderboard
  update is broadcast to subscribed WebSocket clients after a successful score
  submission.

`/api/scores/live` and `/api/rooms/:code/live` become WebSocket endpoints. The
client hook keeps its reconnect behaviour and callback contract while using
`WebSocket` rather than `EventSource`.

## Project Layout

- `worker/` contains the Worker entry point, routing, Durable Object classes,
  D1 repository, and Cloudflare runtime tests.
- `migrations/` contains the D1 schema for scores and its supporting index.
- `wrangler.jsonc` defines Worker assets, D1 binding, Durable Object binding,
  migrations, and local development settings.
- Root package scripts build the client before Wrangler commands and expose
  local development, database migration, and deploy commands.
- Existing Node server code remains available for local legacy development only
  unless it is replaced by shared pure modules. Production documentation points
  exclusively to the Worker workflow.

## Security and Reliability

- The Worker accepts same-origin production traffic. Local cross-origin access
  remains an explicit development setting.
- Rate limiting becomes Cloudflare-compatible; authoritative game and room
  mutation routes are serialized by their Durable Object.
- No player-provided total score is accepted. Word score computation remains
  server-side and idempotent per game session.
- Durable Object storage provides TTL bookkeeping and survives Worker isolate
  eviction. D1 is the only persistent user-facing data store.
- Client reconnection resumes live updates after a transient network failure.

## Verification

- Existing pure game-rule tests remain green.
- New Worker tests cover D1 score queries, game validation/session behavior,
  room lifecycle, and WebSocket broadcast payloads.
- `pnpm lint`, `pnpm test`, and the production `pnpm build` all run before a
  deploy commit.
- `wrangler deploy --dry-run` validates Cloudflare configuration without
  publishing.

## Deployment Commands

The README will document the exact commands:

```powershell
pnpm install
pnpm run cf:login
pnpm run cf:d1:create
# Copy the returned database_id into wrangler.jsonc.
pnpm run cf:db:migrate:remote
pnpm run deploy
```

The user supplies their Cloudflare account authentication and the D1 database
identifier. No secret, API token, account identifier, or generated Wrangler
configuration is committed.

## Scope Boundaries

- The deployment targets Cloudflare Workers, not Pages-only hosting.
- The production path does not rely on Node compatibility mode.
- The current API semantics are preserved where possible; only live transport
  changes from SSE to WebSocket.
- Custom domains and Cloudflare dashboard account setup remain manual steps
  documented in the README.
