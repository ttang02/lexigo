# Ruzzle FR

Web implementation of the French Ruzzle word game.

## Stack

- Client: React 18, Vite, Tailwind CSS, Framer Motion
- Server: Node 20, Express, node:sqlite (built-in), in-memory Trie
- Tests: Vitest, React Testing Library, Supertest

## Setup

1. Install pnpm 9+ and Node 20+.
2. `pnpm install`
3. Copy `.env.example` to `.env`.
4. Provide a French dictionary at `server/data/dict.txt` (one word per line; UTF-8). Words are normalized (uppercase, accents stripped) at load.
5. `pnpm dev` — client on http://localhost:5173, server on http://localhost:3001.

## Scripts

- `pnpm dev` — run client and server concurrently
- `pnpm build` — build the client for production
- `pnpm test` — run all Vitest suites
- `pnpm lint` — lint both packages

## Project layout

See `docs/superpowers/specs/2026-05-15-ruzzle-game-design.md` for the full design.

## API

| Method | Path | Description |
|---|---|---|
| GET | /api/grid | Generate a new grid and store it in the server cache (TTL 10 min). |
| POST | /api/validate | Validate a path+word against a cached grid; returns score. |
| POST | /api/scores | Upsert a score by pseudo (only if greater than existing). |
| GET | /api/scores?limit=N | Top scores, descending. |
