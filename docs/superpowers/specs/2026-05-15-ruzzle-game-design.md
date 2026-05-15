# Ruzzle FR — Design Spec

**Date:** 2026-05-15
**Status:** Approved
**Author:** Lam (with Claude)

## 1. Overview

Web implementation of the Ruzzle word game (French). Player gets a 4×4 letter grid with bonus tiles and 2 minutes to form as many valid French words as possible by connecting adjacent letters. Scoring follows Scrabble-style letter values modified by tile bonuses (DL/TL/DW/TW) and a word-length bonus. Scores are persisted server-side per pseudo (no auth) and displayed on a leaderboard.

## 2. Goals & Non-Goals

**Goals:**
- Fun, responsive 4×4 word game playable on mobile and desktop.
- Authoritative server-side word validation and scoring (no client trust).
- Persistent leaderboard keyed by pseudo (latest higher score wins).
- Polished visuals and animations following the design system below.

**Non-Goals:**
- User accounts / authentication.
- Multiplayer / real-time play.
- Mobile native apps.
- Internationalization beyond French.

## 3. Game Rules

- Grid: 4×4 = 16 letter cells. Some cells carry a bonus.
- Path: letters chained via 8-neighbor adjacency (horizontal, vertical, diagonal).
- No cell reused inside a single word.
- Word length: 2–16 letters.
- A word cannot be submitted twice in the same game (even via a different path).
- Round duration: 120 seconds.

## 4. Scoring

### 4.1 Letter values

| Letters | Points |
|---|---|
| A, E, I, L, N, O, R, S, T, U | 1 |
| D, G, M | 2 |
| B, C, P | 3 |
| F, H, V | 4 |
| J, Q | 8 |
| K, W, X, Y, Z | 10 |

### 4.2 Bonus tiles

| Bonus | Effect |
|---|---|
| DL | Double letter value |
| TL | Triple letter value |
| DW | Double total word score |
| TW | Triple total word score |

### 4.3 Word length bonus

| Length | Bonus |
|---|---|
| 5 | +5 |
| 6 | +10 |
| 7 | +15 |
| 8+ | +20 |

### 4.4 Calculation order (authoritative on server)

1. Sum each letter value, applying DL/TL on the cell where the letter sits.
2. Multiply step-1 total by all DW/TW bonuses on the path (cumulative: DW + TW = ×6).
3. Add length bonus to the step-2 result.

## 5. Architecture

Monorepo with two services managed by pnpm workspaces:

- **client/** — React 18 + Vite + Tailwind CSS + Framer Motion.
- **server/** — Node.js + Express + better-sqlite3 + in-memory Trie.

**Data flow:**
1. On boot, server loads dictionary file → builds Trie in RAM.
2. Client `GET /api/grid` → receives `{gridId, cells, seed}`.
3. Client tracks path locally (adjacency + dedup).
4. On word submit: `POST /api/validate` → server re-validates path against cached grid, checks Trie, computes score, returns `{valid, score}`.
5. End of round: `POST /api/scores` with `{pseudo, score}` → upsert (only if score > existing).
6. `GET /api/scores?limit=20` → leaderboard.

Server is the authority for grid generation, word validation, and scoring; the client only enforces adjacency / dedup UX and renders results.

## 6. Components

### 6.1 Server (`server/src/`)

- `index.js` — Express bootstrap; loads dict; mounts routes.
- `dict.js` — Trie (`insert`, `hasWord`, `hasPrefix`); accent normalization (É→E, À→A, Ç→C, etc.); uppercase.
- `grid.js` — Generates a 4×4 grid using weighted French letter frequency (Scrabble FR pool of ~98 tiles, sampled without replacement to 16). Places 3–4 bonus tiles per grid with distribution: 60% DL, 20% TL, 15% DW, 5% TW.
- `score.js` — Pure function: takes `{path, cells, word}` → computes score per §4.4.
- `db.js` — better-sqlite3 wrapper; prepared statements; upsert helper.
- `routes/grid.js`, `routes/validate.js`, `routes/scores.js`.
- `gridCache.js` — In-memory map `gridId → {cells, createdAt}`, TTL 10 min, cleanup on access.

### 6.2 Client (`client/src/`)

- `App.jsx` — Top-level state machine: `menu → game → end → leaderboard`.
- `components/Grid.jsx` — 4×4 grid; drag and click-chain input; renders SVG path overlay.
- `components/Tile.jsx` — Letter + bonus badge; selected/disabled visual states.
- `components/Timer.jsx` — Countdown anchored on `Date.now()` (resilient to tab inactivity).
- `components/WordList.jsx` — Found words + per-word scores; total at top.
- `components/EndForm.jsx` — Pseudo input + submit.
- `components/Leaderboard.jsx` — Top scores table.
- `hooks/usePathSelection.js` — 8-neighbor adjacency, dedup, path building.
- `hooks/useTimer.js` — Tick + end detection.
- `api.js` — Fetch wrappers, error normalization.

## 7. API

### 7.1 Endpoints

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/grid` | — | `{ gridId: string, cells: [{ letter: string, bonus: "DL"\|"TL"\|"DW"\|"TW"\|null }] (length 16), seed: number }` |
| POST | `/api/validate` | `{ gridId, path: number[], word: string }` | `{ valid: boolean, score: number, reason?: string }` |
| POST | `/api/scores` | `{ pseudo: string, score: number }` | `{ ok: boolean, rank: number }` |
| GET | `/api/scores?limit=20` | — | `[{ pseudo, score, updated_at }, ...]` |

### 7.2 Error responses

- `400` — validation failure (invalid path, word not in dictionary, expired grid, malformed payload). Body: `{ error: string, code: string }`.
- `500` — wrapped server error (logged); generic message returned.

### 7.3 Anti-cheat

- Server re-runs adjacency check on `path` against `cells` of `gridId`.
- Server re-derives `word` from `path + cells` and rejects if it differs from client-submitted `word`.
- Server checks dict (Trie) using normalized form.
- Grid TTL prevents replay across long sessions.

## 8. Data

### 8.1 SQLite schema

```sql
CREATE TABLE IF NOT EXISTS scores (
  pseudo TEXT PRIMARY KEY,
  score INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores (score DESC);
```

Upsert:
```sql
INSERT INTO scores (pseudo, score, updated_at)
VALUES (?, ?, ?)
ON CONFLICT(pseudo) DO UPDATE SET
  score = excluded.score,
  updated_at = excluded.updated_at
WHERE excluded.score > scores.score;
```

### 8.2 Dictionary

- File provided by user, path configurable via `DICT_PATH` env var, default `server/data/dict.txt`.
- One word per line, any case, any accent form.
- Normalization at load: trim, uppercase, strip accents (NFD + remove combining marks).
- Filter words by length 2–16.
- Stored in a Trie (array-of-children-by-letter-index, 26 slots).

### 8.3 Pseudo

- 1–20 characters, trimmed, allowed characters `[A-Za-z0-9_\- ]`.
- Validated server-side; 400 if invalid.

## 9. UI / UX Design System

### 9.1 Style

Playful + Bento, dark mode default, vibrant accents. Tiles are the visual hero.

### 9.2 Color palette

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0F0B1F` | App background |
| `--surface` | `#1A1530` | Cards, panels |
| `--surface-2` | `#241D40` | Tile background |
| `--primary` | `#8B5CF6` | Selected tile, primary CTA |
| `--accent` | `#FBBF24` | Bonuses, scores |
| `--success` | `#10B981` | Valid word feedback |
| `--danger` | `#EF4444` | Invalid word, last 10s timer |
| `--text` | `#F4F1FF` | Body text |
| `--text-muted` | `#9B96B5` | Secondary text |
| Bonus DL | `#3B82F6` | Blue |
| Bonus TL | `#8B5CF6` | Violet |
| Bonus DW | `#F97316` | Orange |
| Bonus TW | `#DC2626` | Red |

Light mode is out of scope for v1.

### 9.3 Typography (Google Fonts)

- **Display / Tiles / Scores:** Space Grotesk, weights 500 / 600 / 700, with `font-variant-numeric: tabular-nums` for scores and timer.
- **Body / UI:** Inter, weights 400 / 500.
- Scale: 12 / 14 / 16 (base) / 18 / 24 / 32 / 48.
- Tile letter: 32–40px depending on viewport.

### 9.4 Effects

- Border-radius scale: 8 / 12 / 16 / 20.
- Tile shadow: subtle inner highlight + soft outer drop.
- Selected tile: outer glow (`--primary` @ 40% alpha, 0 0 16px), 2px ring.
- Path overlay: SVG polyline, stroke `--accent`, width 6, rounded join, glow filter.

### 9.5 Animation (Framer Motion)

- Tile press: spring scale 0.95, `{stiffness: 300, damping: 20}`.
- Tile hover (desktop): scale 1.05.
- Valid word: tiles flash success color + scale pulse 1.0 → 1.1 → 1.0 over 250ms; score number floats up and fades.
- Invalid word: tiles shake ±8px over 200ms + danger color flash.
- Timer last 10s: 1s pulse loop on the timer label, danger color.
- Page transitions: 200ms fade + 8px slide.
- All animations are wrapped to respect `prefers-reduced-motion`: motion shortens to 80ms, shake/pulse disabled.

### 9.6 Layout

- Mobile-first; primary breakpoints 375 / 768 / 1024.
- Grid: aspect-square, `max-width: min(92vw, 480px)`, gap 8px.
- Mobile: grid centered, word list in a bottom drawer with handle.
- Desktop (≥1024px): grid left, side panel right with score, timer, word list.
- Safe-area padding on iOS (`env(safe-area-inset-*)`).

### 9.7 Accessibility

- All foreground/background pairs ≥ 4.5:1 (verified at impl time).
- Keyboard nav: arrow keys move focus, Space/Enter adds tile to path, Esc clears path, Enter on last tile submits word.
- `aria-label` on each tile: e.g. `"Letter A, double letter bonus"`.
- `aria-live="polite"` region for word validation feedback.
- Focus ring: 2px solid `--accent`, offset 2px.
- `prefers-reduced-motion` honored across all animations.

## 10. Game Flow

1. **Menu screen** — Title, "Play" button, "Leaderboard" button.
2. **Game screen** — Server returns grid. Timer starts when first tile pressed (or after a short countdown — see Open Questions §13). Player builds paths; each path either confirmed (Enter / release) or canceled (Esc / tap outside). Valid words add to list with score. Invalid words: visual feedback, no penalty.
3. **End screen** — Auto-triggered at 0:00. Shows total, list of found words. Form: pseudo input + Submit.
4. **Leaderboard screen** — Top 20 scores, descending.

## 11. Testing

### 11.1 Server (Vitest)

- `dict.test.js` — Trie insert/lookup; accent normalization (`éléphant` → `ELEPHANT`); prefix check.
- `score.test.js` — Letter sums; DL/TL; DW only; TW only; DW+TW = ×6; length bonus at 5/6/7/8+; calculation order.
- `grid.test.js` — Exactly 16 cells; only valid letters; bonus count within range; distribution roughly matches config across many samples.
- `routes/validate.test.js` — Adjacency enforcement; reuse rejection; expired grid; word/path mismatch; dictionary miss.
- `db.test.js` — Upsert only on higher score; ordering on leaderboard.

### 11.2 Client (Vitest + React Testing Library)

- `usePathSelection.test.js` — 8-neighbor adjacency; no reuse; backtrack via last-tile tap.
- `useTimer.test.js` — Countdown precision; end callback fires once.
- `EndForm.test.js` — Validation, submit flow, error display.
- `Grid.test.js` — Renders 16 tiles; click chain builds path.

### 11.3 Manual / smoke

- Play a full round on mobile (375px) and desktop (1440px).
- Toggle `prefers-reduced-motion` and re-verify.
- Network throttle on `/api/validate`.

## 12. Project Structure

```
ruzzle/
├── server/
│   ├── src/
│   │   ├── index.js
│   │   ├── dict.js
│   │   ├── grid.js
│   │   ├── gridCache.js
│   │   ├── score.js
│   │   ├── db.js
│   │   └── routes/
│   │       ├── grid.js
│   │       ├── validate.js
│   │       └── scores.js
│   ├── data/
│   │   ├── dict.txt           (user-provided; gitignored except a sample)
│   │   └── scores.sqlite      (gitignored)
│   ├── tests/
│   ├── package.json
│   └── vitest.config.js
├── client/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api.js
│   │   └── styles/
│   │       └── tokens.css
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── docs/superpowers/specs/
├── package.json               (pnpm workspaces, scripts)
├── pnpm-workspace.yaml
├── .gitignore
├── .env.example
└── README.md
```

**Root scripts:**
- `pnpm dev` — `concurrently` runs client (Vite) and server (nodemon).
- `pnpm build` — Client `vite build`; server is plain Node (no bundling).
- `pnpm test` — Runs Vitest across both workspaces.
- `pnpm lint` — ESLint across both workspaces.

## 13. Open Questions

- **Game start trigger:** does the 2-minute timer start automatically after grid load, or after the first tile press? Default to "after first tile press" with a brief "Ready?" overlay.
- **Path input mode:** support both drag and click-chain, or one only? Default to both, with drag as the primary on touch and click-chain as the primary on desktop.
- **Bonus tile count:** fixed at 4, or randomized 3–4? Default to randomized 3–4.

These can be resolved during implementation without architectural impact.

## 14. References

- Original brief: `Spécifications du Jeu Ruzzle pour Claude Code.md` (provided by user).
- Source PDF: `RuzzleFONGUE_EtienneTANG_THANH_LamCompteRendu.pdf`.
