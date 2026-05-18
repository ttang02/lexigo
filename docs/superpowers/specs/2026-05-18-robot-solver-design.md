# Robot Solver — Design Spec

**Date:** 2026-05-18
**Feature:** Post-game robot that finds all valid words on the grid and animates the replay.

---

## Overview

After a game ends, the player can click "Voir la solution du robot". The server solves the grid (DFS + Trie), returns all valid words with their paths and scores. The client then plays them back one by one, highlighting each tile path with a gold animation before clearing and moving to the next word. When the replay is done, the player returns to the End screen to submit their score.

---

## Architecture

### Server — `server/src/solver.js`

New module. Exports `solve({ cells, trie })`.

**Algorithm:**
- For each of the 16 cells as starting point, run a DFS.
- At each step, check `trie.hasPrefix(currentWord)` — prune the branch if no word in the dict starts with the current prefix (dead end).
- If `trie.hasWord(currentWord)` and `currentWord.length >= 2`, record the solution.
- Adjacency rule: same as `isPathValid` — cells must be 8-directionally adjacent, no revisit.
- Deduplication: if the same word is found via multiple paths, keep only the highest-scoring path.
- Returns: `Array<{ word: string, path: number[], score: number }>` sorted by score descending.

**Complexity:** bounded by the Trie — prefix pruning keeps it fast in practice (typically < 50ms on a 4×4 grid with a 300k-word French dict).

### Server — new route in `server/src/app.js`

```
GET /api/solve?gridId=<id>
```

- Reads `cells` from `cache.get(gridId)`.
- Returns `400 { error, code: "GRID_MISSING" }` if cache miss.
- Calls `solve({ cells, trie })`.
- Returns `200 { solutions: [{ word, path, score }] }`.
- No auth, same CORS as other routes.

### Client — `client/src/hooks/useRobotReplay.js`

State machine driving the tile-by-tile animation.

**Props:** `{ solutions: Array<{ word, path, score }>, cells }`

**States:**
- `idle` — not started
- `playing` — `wordIndex` (0…n-1), `stepIndex` (0…path.length)
- `done` — all words shown

**Timing per word (400ms total budget):**
- Tiles revealed one by one: `40ms` stagger × path.length (e.g. 4-letter word = 160ms)
- Hold (all tiles lit): `100ms`
- Clear (reset to idle): `160ms`
- Gap before next word: `40ms`

**Exposes:**
```js
{
  play(),          // start or restart
  skip(),          // jump to done
  activeIndices,   // Set<number> — tiles currently lit by robot
  currentEntry,    // { word, path, score } | null
  wordIndex,       // number
  total,           // number — solutions.length
  done,            // boolean
}
```

**Reduced motion:** when `usePrefersReducedMotion()` is true, skip tile stagger — show all tiles at once, hold 300ms, then clear.

### Client — `client/src/api.js`

New function:
```js
export async function fetchSolution(gridId) {
  const r = await fetch(`/api/solve?gridId=${encodeURIComponent(gridId)}`);
  if (!r.ok) throw new Error("solve failed");
  return r.json(); // { solutions: [...] }
}
```

### Client — `client/src/screens/RobotReplay.jsx`

New screen. Shown after player clicks "Voir la solution du robot" from End screen.

**Layout:**
- Header: "Solution du robot" title + "Passer →" skip button (top right)
- Center: existing `Grid` component, read-only (no `onTap`), receives `robotPath` prop
- Bottom strip: current word (large, gold) + score + progress counter "mot 3 / 47"
- On `done`: auto-calls `onDone()` after 800ms (smooth transition back to End)

**Props:** `{ gridId, cells, onDone }`

**Behavior:**
1. On mount: calls `fetchSolution(gridId)` → stores solutions
2. Auto-starts replay (no button needed — triggered immediately after fetch)
3. "Passer" button: calls `skip()` then `onDone()` immediately
4. On `done`: waits 800ms then calls `onDone()`

### Client — `client/src/components/Tile.jsx`

Add `robotSelected` boolean prop.

**Visual state when `robotSelected`:**
- `bg-amber-400 text-black ring-2 ring-amber-200`
- Framer Motion `animate={{ scale: 1.12 }}` with spring `{ stiffness: 400, damping: 18 }`
- On deselect: spring back to `scale: 1`

Priority order: `robotSelected` > `selected` (human) > normal.

### Client — `client/src/components/Grid.jsx`

Add `robotPath` prop (optional `number[]`, default `[]`).

Derives `robotSelected = new Set(robotPath)` and passes `robotSelected={robotSelected.has(i)}` to each `Tile`.

### Client — `client/src/screens/End.jsx`

Add "Voir la solution du robot" button (only shown if `gridId` is available).

When clicked: calls `onRobotReplay()` prop.

### Client — `client/src/App.jsx`

Add `"robot"` screen to the state machine.

```
"end" → (onRobotReplay) → "robot"
"robot" → (onDone) → "end"
```

Pass `{ gridId, cells }` from Game → stored in App state for use by RobotReplay.

---

## Data flow

```
Game ends
  → App stores { gridId, cells } in state
  → setScreen("end")

End screen
  → player clicks "Voir la solution du robot"
  → setScreen("robot")

RobotReplay screen
  → fetchSolution(gridId)       [GET /api/solve?gridId=...]
  ← { solutions: [{word, path, score}] }
  → useRobotReplay drives animation
  → done or skip → onDone() → setScreen("end")
```

---

## Error handling

- `GRID_MISSING` (cache expired after 10min TTL): show "Grille expirée, solution indisponible." with a back button. Grid TTL is 10 min; game is 2 min — this should never happen in normal flow.
- Network error: same error message.
- Empty solutions (no valid words found): show "Aucun mot valide trouvé." and auto-return to End after 2s.

---

## Testing

**Server:**
- `server/tests/solver.test.js` — unit tests for `solve()`:
  - Returns known words for a fixed grid
  - Correctly deduplicates same word via different paths (keeps best score)
  - Returns empty array when no valid words
  - Words are sorted score descending

**Client:**
- `client/src/hooks/useRobotReplay.test.js` — hook unit tests:
  - `play()` advances through words and steps
  - `skip()` jumps to done
  - `activeIndices` matches expected Set at each step
- `client/src/screens/RobotReplay.test.jsx` — integration:
  - Renders grid + progress counter
  - Skip button calls onDone

---

## Out of scope

- Showing the robot score as a "rival" score on the leaderboard
- Replay speed control (slider)
- Pause/resume within replay
