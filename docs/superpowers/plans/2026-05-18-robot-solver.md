# Robot Solver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Post-game robot that solves the Ruzzle grid server-side and replays all valid words with tile animations on the client.

**Architecture:** New `server/src/solver.js` (DFS + Trie) exposed via `GET /api/solve?gridId=<id>`. Client calls it once at game end, then `useRobotReplay` hook drives a staggered tile-by-tile animation in a new `RobotReplay` screen. Triggered by "Voir la solution du robot" button on the End screen.

**Tech Stack:** Node + Express + Trie (server), React + Framer Motion + Vitest/RTL (client), pnpm monorepo.

**Reference spec:** `docs/superpowers/specs/2026-05-18-robot-solver-design.md`

---

## File map

| Action | File | Purpose |
|---|---|---|
| Create | `server/src/solver.js` | DFS solver — finds all valid words on a grid |
| Create | `server/tests/solver.test.js` | Unit tests for solver |
| Modify | `server/src/app.js` | Add `GET /api/solve` route |
| Modify | `server/tests/routes.test.js` | Tests for new route |
| Modify | `client/src/api.js` | Add `fetchSolution(gridId)` |
| Modify | `client/src/api.test.js` | Test for new function |
| Create | `client/src/hooks/useRobotReplay.js` | Animation state machine hook |
| Create | `client/src/hooks/useRobotReplay.test.js` | Hook unit tests |
| Modify | `client/src/components/Tile.jsx` | Add `robotSelected` prop + gold visual |
| Modify | `client/src/components/Grid.jsx` | Add `robotPath` prop |
| Modify | `client/src/components/Tile.test.jsx` | Verify robotSelected rendering |
| Modify | `client/src/components/Grid.test.jsx` | Verify robotPath plumbing |
| Create | `client/src/screens/RobotReplay.jsx` | Replay screen |
| Create | `client/src/screens/RobotReplay.test.jsx` | Screen integration tests |
| Modify | `client/src/screens/Game.jsx` | Pass `gridId` + `cells` in `onEnd` |
| Modify | `client/src/screens/End.jsx` | Add `onRobotReplay` prop + button |
| Modify | `client/src/App.jsx` | Add `"robot"` screen + store `gameResult` |

---

## Phase 1 — Server

### Task 1: Solver module (TDD)

**Files:**
- Create: `server/src/solver.js`
- Create: `server/tests/solver.test.js`

- [ ] **Step 1: Write failing tests**

Create `server/tests/solver.test.js`:

```js
import { describe, it, expect } from "vitest";
import { solve } from "../src/solver.js";
import { Trie } from "../src/dict.js";

const cell = (l) => ({ letter: l, bonus: null });

// 4×4 grid:
//   C H A T   (0-3)
//   I E N S   (4-7)
//   E R A T   (8-11)
//   L D O G   (12-15)
const CELLS = [
  cell("C"), cell("H"), cell("A"), cell("T"),
  cell("I"), cell("E"), cell("N"), cell("S"),
  cell("E"), cell("R"), cell("A"), cell("T"),
  cell("L"), cell("D"), cell("O"), cell("G"),
];

function makeTrie(...words) {
  const t = new Trie();
  words.forEach((w) => t.insert(w));
  return t;
}

describe("solve", () => {
  it("finds known words on the grid", () => {
    const trie = makeTrie("CHAT", "HEN");
    // CHAT: C(0)→H(1)→A(2)→T(3) adjacent ✓
    // HEN:  H(1)→E(5)→N(6) adjacent ✓
    const results = solve({ cells: CELLS, trie });
    const words = results.map((r) => r.word);
    expect(words).toContain("CHAT");
    expect(words).toContain("HEN");
  });

  it("does not include words not in trie", () => {
    const trie = makeTrie("CHAT");
    const results = solve({ cells: CELLS, trie });
    const words = results.map((r) => r.word);
    expect(words).not.toContain("HEN");
  });

  it("deduplicates same word found via multiple paths — keeps highest score", () => {
    // "ER" reachable via [5,9] (E row1col1→R row2col1) and [8,9] (E row2col0→R row2col1)
    // Use bonus on cell 5 to make [5,9] score higher
    const cells = [...CELLS];
    cells[5] = { letter: "E", bonus: "DL" }; // doubles E value
    const trie = makeTrie("ER");
    const results = solve({ cells, trie });
    const erResults = results.filter((r) => r.word === "ER");
    expect(erResults).toHaveLength(1);
    expect(erResults[0].path).toEqual([5, 9]); // DL path scores higher
  });

  it("returns results sorted by score descending", () => {
    const trie = makeTrie("CHAT", "HEN");
    const results = solve({ cells: CELLS, trie });
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("returns empty array when no dict words are reachable on the grid", () => {
    const trie = makeTrie("ZZZZZ");
    const results = solve({ cells: CELLS, trie });
    expect(results).toEqual([]);
  });

  it("each result has word, path, and score fields", () => {
    const trie = makeTrie("CHAT");
    const [result] = solve({ cells: CELLS, trie });
    expect(typeof result.word).toBe("string");
    expect(Array.isArray(result.path)).toBe(true);
    expect(typeof result.score).toBe("number");
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd server && npx vitest run tests/solver.test.js
```
Expected: FAIL — `Cannot find module '../src/solver.js'`

- [ ] **Step 3: Implement `server/src/solver.js`**

```js
import { computeScore } from "./score.js";

const COLS = 4;
const ROWS = 4;

function neighbors(idx) {
  const r = Math.floor(idx / COLS);
  const c = idx % COLS;
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        result.push(nr * COLS + nc);
      }
    }
  }
  return result;
}

export function solve({ cells, trie }) {
  const best = new Map(); // word → { path, score }

  function dfs(idx, path, visited, word) {
    if (!trie.hasPrefix(word)) return;
    if (word.length >= 2 && trie.hasWord(word)) {
      const score = computeScore({ path, cells });
      const existing = best.get(word);
      if (!existing || score > existing.score) {
        best.set(word, { path: [...path], score });
      }
    }
    for (const next of neighbors(idx)) {
      if (!visited.has(next)) {
        visited.add(next);
        path.push(next);
        dfs(next, path, visited, word + cells[next].letter);
        path.pop();
        visited.delete(next);
      }
    }
  }

  for (let i = 0; i < cells.length; i++) {
    const visited = new Set([i]);
    dfs(i, [i], visited, cells[i].letter);
  }

  return Array.from(best.entries())
    .map(([word, { path, score }]) => ({ word, path, score }))
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd server && npx vitest run tests/solver.test.js
```
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/solver.js server/tests/solver.test.js
git commit -m "feat(server): solver — DFS + Trie finds all valid words on grid"
```

---

### Task 2: Route `GET /api/solve`

**Files:**
- Modify: `server/src/app.js`
- Modify: `server/tests/routes.test.js`

- [ ] **Step 1: Add failing route test**

Append to `server/tests/routes.test.js` (after the existing describe blocks):

```js
import { solve } from "../src/solver.js";

describe("GET /api/solve", () => {
  it("returns solutions array for a known grid", async () => {
    const { app, cache } = makeApp();
    // Insert a word that's reachable: CHAT (C→H→A→T at positions 0-3)
    // makeApp() trie already has CHAT
    cache.set("solve-id", [
      { letter: "C", bonus: null }, { letter: "H", bonus: null },
      { letter: "A", bonus: null }, { letter: "T", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null },
    ]);
    const res = await request(app).get("/api/solve?gridId=solve-id");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.solutions)).toBe(true);
    const words = res.body.solutions.map((s) => s.word);
    expect(words).toContain("CHAT");
    res.body.solutions.forEach((s) => {
      expect(typeof s.word).toBe("string");
      expect(Array.isArray(s.path)).toBe(true);
      expect(typeof s.score).toBe("number");
    });
  });

  it("returns 400 GRID_MISSING for unknown gridId", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/solve?gridId=unknown");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("GRID_MISSING");
  });
});
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
cd server && npx vitest run tests/routes.test.js
```
Expected: 2 new tests fail — route not defined yet.

- [ ] **Step 3: Add route to `server/src/app.js`**

Add the import at the top (after existing imports):

```js
import { solve } from "./solver.js";
```

Add the route after `app.get("/api/grid", ...)` and before `app.post("/api/validate", ...)`:

```js
  app.get("/api/solve", (req, res) => {
    const { gridId } = req.query;
    const cells = cache.get(gridId);
    if (!cells) return res.status(400).json({ error: "grid expired or unknown", code: "GRID_MISSING" });
    const solutions = solve({ cells, trie });
    res.json({ solutions });
  });
```

- [ ] **Step 4: Run all server tests — verify all pass**

```bash
cd server && npx vitest run
```
Expected: all tests pass (including existing 46 + 2 new route tests = 48 total, plus 6 solver tests = 54 total across both files... actually vitest runs all files: 7 test files + 1 new + 1 modified).

- [ ] **Step 5: Commit**

```bash
git add server/src/app.js server/tests/routes.test.js
git commit -m "feat(server): add GET /api/solve route"
```

---

## Phase 2 — Client API + Hook

### Task 3: `fetchSolution` API function

**Files:**
- Modify: `client/src/api.js`
- Modify: `client/src/api.test.js`

- [ ] **Step 1: Add failing test**

Append to the `describe("api", ...)` block in `client/src/api.test.js`:

```js
  it("fetchSolution GETs /api/solve with gridId", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ solutions: [{ word: "CHAT", path: [0,1,2,3], score: 10 }] }),
    });
    const r = await api.fetchSolution("abc-123");
    expect(fetch).toHaveBeenCalledWith("/api/solve?gridId=abc-123");
    expect(r.solutions).toHaveLength(1);
    expect(r.solutions[0].word).toBe("CHAT");
  });
```

- [ ] **Step 2: Run — verify it fails**

```bash
cd client && npx vitest run src/api.test.js
```
Expected: FAIL — `api.fetchSolution is not a function`

- [ ] **Step 3: Add `fetchSolution` to `client/src/api.js`**

Append after `fetchLeaderboard`:

```js
export async function fetchSolution(gridId) {
  const r = await fetch(`/api/solve?gridId=${encodeURIComponent(gridId)}`);
  return json(r);
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd client && npx vitest run src/api.test.js
```
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/api.js client/src/api.test.js
git commit -m "feat(client): add fetchSolution API function"
```

---

### Task 4: `useRobotReplay` hook (TDD)

**Files:**
- Create: `client/src/hooks/useRobotReplay.js`
- Create: `client/src/hooks/useRobotReplay.test.js`

- [ ] **Step 1: Write failing tests**

Create `client/src/hooks/useRobotReplay.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRobotReplay } from "./useRobotReplay.js";

// matchMedia stub returns prefers-reduced-motion: false → full animation path
// (already set up in test-setup.js)

const SOLUTIONS = [
  { word: "AB", path: [0, 1], score: 5 },
  { word: "CD", path: [2, 3], score: 3 },
];

describe("useRobotReplay", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts idle with no active indices and not done", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    expect(result.current.idle).toBe(true);
    expect(result.current.done).toBe(false);
    expect(result.current.activeIndices.size).toBe(0);
    expect(result.current.currentEntry).toBeNull();
  });

  it("play() exits idle state", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    expect(result.current.idle).toBe(false);
  });

  it("skip() sets done immediately", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => result.current.skip());
    expect(result.current.done).toBe(true);
    expect(result.current.activeIndices.size).toBe(0);
  });

  it("after 40ms, first tile of first word is active", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(40); });
    expect(result.current.activeIndices.has(0)).toBe(true);
    expect(result.current.currentEntry?.word).toBe("AB");
  });

  it("after 80ms, both tiles of first word are active", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(80); });
    expect(result.current.activeIndices.has(0)).toBe(true);
    expect(result.current.activeIndices.has(1)).toBe(true);
  });

  it("after first word completes (80+100+160+40=380ms), moves to second word", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    // 40ms × 2 tiles + 100ms hold + 160ms clear + 40ms gap = 380ms
    act(() => { vi.advanceTimersByTime(380); });
    expect(result.current.currentEntry?.word).toBe("CD");
  });

  it("done after all words finish", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    // Word 1: 380ms. Word 2: 380ms. Total: 760ms.
    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current.done).toBe(true);
    expect(result.current.activeIndices.size).toBe(0);
  });

  it("total equals solutions.length", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    expect(result.current.total).toBe(2);
  });

  it("wordIndex starts at 0 after play", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    expect(result.current.wordIndex).toBe(0);
  });
});
```

- [ ] **Step 2: Run — verify they fail**

```bash
cd client && npx vitest run src/hooks/useRobotReplay.test.js
```
Expected: FAIL — `Cannot find module './useRobotReplay.js'`

- [ ] **Step 3: Implement `client/src/hooks/useRobotReplay.js`**

```js
import { useState, useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion.js";

const STAGGER_MS = 40;
const HOLD_MS = 100;
const CLEAR_MS = 160;
const GAP_MS = 40;
const REDUCED_HOLD_MS = 300;

export function useRobotReplay({ solutions }) {
  const [wordIndex, setWordIndex] = useState(-1); // -1 = idle
  const [stepIndex, setStepIndex] = useState(0);
  const [activeIndices, setActiveIndices] = useState(new Set());
  const [done, setDone] = useState(false);
  const reduced = usePrefersReducedMotion();
  const timerRef = useRef(null);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  function play() {
    clearTimer();
    setDone(false);
    setActiveIndices(new Set());
    setWordIndex(0);
    setStepIndex(0);
  }

  function skip() {
    clearTimer();
    setActiveIndices(new Set());
    setDone(true);
    setWordIndex(-1);
  }

  useEffect(() => {
    if (wordIndex < 0 || done) return;

    if (wordIndex >= solutions.length) {
      setActiveIndices(new Set());
      setDone(true);
      return;
    }

    const entry = solutions[wordIndex];
    const path = entry.path;

    if (reduced) {
      setActiveIndices(new Set(path));
      timerRef.current = setTimeout(() => {
        setActiveIndices(new Set());
        timerRef.current = setTimeout(() => {
          setWordIndex((wi) => wi + 1);
          setStepIndex(0);
        }, GAP_MS);
      }, REDUCED_HOLD_MS);
      return clearTimer;
    }

    if (stepIndex < path.length) {
      timerRef.current = setTimeout(() => {
        setActiveIndices((prev) => new Set([...prev, path[stepIndex]]));
        setStepIndex((si) => si + 1);
      }, STAGGER_MS);
    } else if (stepIndex === path.length) {
      timerRef.current = setTimeout(() => {
        setStepIndex((si) => si + 1);
      }, HOLD_MS);
    } else {
      timerRef.current = setTimeout(() => {
        setActiveIndices(new Set());
        timerRef.current = setTimeout(() => {
          setWordIndex((wi) => wi + 1);
          setStepIndex(0);
        }, GAP_MS);
      }, CLEAR_MS);
    }

    return clearTimer;
  }, [wordIndex, stepIndex, done, solutions, reduced]);

  const currentEntry =
    wordIndex >= 0 && wordIndex < solutions.length ? solutions[wordIndex] : null;

  return {
    play,
    skip,
    activeIndices,
    currentEntry,
    wordIndex: Math.max(0, wordIndex),
    total: solutions.length,
    done,
    idle: wordIndex < 0 && !done,
  };
}
```

- [ ] **Step 4: Run — verify all pass**

```bash
cd client && npx vitest run src/hooks/useRobotReplay.test.js
```
Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useRobotReplay.js client/src/hooks/useRobotReplay.test.js
git commit -m "feat(client): useRobotReplay hook — drives tile-by-tile replay animation"
```

---

## Phase 3 — Client Components

### Task 5: Tile + Grid — robot visual state

**Files:**
- Modify: `client/src/components/Tile.jsx`
- Modify: `client/src/components/Grid.jsx`
- Modify: `client/src/components/Tile.test.jsx`
- Modify: `client/src/components/Grid.test.jsx`

- [ ] **Step 1: Add failing test for Tile**

Open `client/src/components/Tile.test.jsx` and append inside the `describe` block:

```jsx
  it("shows gold ring when robotSelected", () => {
    render(<Tile letter="A" bonus={null} index={0} selected={false} robotSelected={true} onTap={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/amber/);
  });
```

- [ ] **Step 2: Add failing test for Grid**

Open `client/src/components/Grid.test.jsx` and append inside the `describe` block:

```jsx
  it("passes robotSelected to correct tiles", () => {
    const cells = Array.from({ length: 16 }, (_, i) => ({ letter: String.fromCharCode(65 + i % 26), bonus: null }));
    render(<Grid cells={cells} path={[]} robotPath={[2, 5]} onTap={() => {}} />);
    const buttons = screen.getAllByRole("button");
    // Buttons at index 2 and 5 should have amber class
    expect(buttons[2].className).toMatch(/amber/);
    expect(buttons[5].className).toMatch(/amber/);
    expect(buttons[0].className).not.toMatch(/amber/);
  });
```

- [ ] **Step 3: Run tests — verify new tests fail**

```bash
cd client && npx vitest run src/components/Tile.test.jsx src/components/Grid.test.jsx
```
Expected: 2 new tests fail.

- [ ] **Step 4: Update `client/src/components/Tile.jsx`**

Replace full file content:

```jsx
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

const BONUS_LABEL = {
  DL: "double letter",
  TL: "triple letter",
  DW: "double word",
  TW: "triple word",
};
const BONUS_BG = {
  DL: "bg-bonus-dl",
  TL: "bg-bonus-tl",
  DW: "bg-bonus-dw",
  TW: "bg-bonus-tw",
};

const SPRING = { type: "spring", stiffness: 300, damping: 20 };
const ROBOT_SPRING = { type: "spring", stiffness: 400, damping: 18 };

export const tileVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Tile({ letter, bonus, index, selected, robotSelected, onTap }) {
  const reduced = usePrefersReducedMotion();
  const ariaLabel = `Letter ${letter}${bonus ? `, ${BONUS_LABEL[bonus]} bonus` : ""}`;

  let bgClass;
  if (robotSelected) {
    bgClass = "bg-amber-400 text-black ring-2 ring-amber-200";
  } else if (selected) {
    bgClass = "bg-primary text-bg ring-2 ring-accent shadow-[0_0_16px_rgba(139,92,246,0.6)]";
  } else {
    bgClass = "bg-surface-2 text-text-base hover:bg-surface";
  }

  return (
    <motion.button
      type="button"
      onClick={() => onTap(index)}
      aria-label={ariaLabel}
      aria-pressed={selected}
      variants={reduced ? undefined : tileVariants}
      animate={robotSelected && !reduced ? { scale: 1.12 } : { scale: 1 }}
      transition={robotSelected ? ROBOT_SPRING : undefined}
      whileTap={reduced ? {} : { scale: 0.95, transition: SPRING }}
      whileHover={reduced ? {} : { scale: 1.05, transition: SPRING }}
      className={[
        "relative aspect-square rounded-tile font-display font-bold text-3xl md:text-4xl",
        "flex items-center justify-center select-none",
        "transition-colors duration-150",
        bgClass,
      ].join(" ")}
    >
      {letter}
      {bonus && (
        <span className={`absolute top-1 right-1 text-[10px] font-bold px-1 py-0.5 rounded-md text-white ${BONUS_BG[bonus]}`}>
          {bonus}
        </span>
      )}
    </motion.button>
  );
}
```

- [ ] **Step 5: Update `client/src/components/Grid.jsx`**

Replace full file content:

```jsx
import { motion } from "framer-motion";
import { Tile } from "./Tile.jsx";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.018 } },
};

export function Grid({ cells, path, robotPath = [], onTap }) {
  const reduced = usePrefersReducedMotion();
  const selected = new Set(path);
  const robotSelected = new Set(robotPath);
  return (
    <motion.div
      className="grid grid-cols-4 gap-2 w-full max-w-[480px] aspect-square mx-auto p-2 rounded-2xl bg-surface/40"
      role="group"
      aria-label="Ruzzle grid"
      variants={reduced ? undefined : gridVariants}
      initial={reduced ? false : "hidden"}
      animate="visible"
    >
      {cells.map((c, i) => (
        <Tile
          key={i}
          letter={c.letter}
          bonus={c.bonus}
          index={i}
          selected={selected.has(i)}
          robotSelected={robotSelected.has(i)}
          onTap={onTap}
        />
      ))}
    </motion.div>
  );
}
```

- [ ] **Step 6: Run tests — verify all pass**

```bash
cd client && npx vitest run src/components/Tile.test.jsx src/components/Grid.test.jsx
```
Expected: all tests pass (existing + 2 new).

- [ ] **Step 7: Commit**

```bash
git add client/src/components/Tile.jsx client/src/components/Grid.jsx client/src/components/Tile.test.jsx client/src/components/Grid.test.jsx
git commit -m "feat(client): Tile + Grid support robotSelected/robotPath visual state"
```

---

### Task 6: RobotReplay screen

**Files:**
- Create: `client/src/screens/RobotReplay.jsx`
- Create: `client/src/screens/RobotReplay.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/screens/RobotReplay.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RobotReplay } from "./RobotReplay.jsx";
import * as api from "../api.js";

vi.mock("../api.js", () => ({
  fetchSolution: vi.fn(),
}));

const CELLS = Array.from({ length: 16 }, (_, i) => ({
  letter: String.fromCharCode(65 + (i % 26)),
  bonus: null,
}));

const SOLUTIONS = [
  { word: "AB", path: [0, 1], score: 5 },
];

beforeEach(() => {
  api.fetchSolution.mockResolvedValue({ solutions: SOLUTIONS });
});

describe("RobotReplay", () => {
  it("shows loading state before fetch resolves", () => {
    api.fetchSolution.mockReturnValue(new Promise(() => {})); // never resolves
    render(<RobotReplay gridId="g1" cells={CELLS} onDone={() => {}} />);
    expect(screen.getByText(/calcul/i)).toBeInTheDocument();
  });

  it("shows grid and progress after fetch", async () => {
    await act(async () => {
      render(<RobotReplay gridId="g1" cells={CELLS} onDone={() => {}} />);
    });
    expect(screen.getByRole("group", { name: /grid/i })).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 1/)).toBeInTheDocument();
  });

  it("skip button calls onDone", async () => {
    const onDone = vi.fn();
    await act(async () => {
      render(<RobotReplay gridId="g1" cells={CELLS} onDone={onDone} />);
    });
    await userEvent.click(screen.getByText(/passer/i));
    expect(onDone).toHaveBeenCalled();
  });

  it("shows error message when fetch fails", async () => {
    api.fetchSolution.mockRejectedValue(new Error("network"));
    await act(async () => {
      render(<RobotReplay gridId="g1" cells={CELLS} onDone={() => {}} />);
    });
    expect(screen.getByText(/expir/i)).toBeInTheDocument();
  });

  it("shows empty message when no solutions", async () => {
    api.fetchSolution.mockResolvedValue({ solutions: [] });
    await act(async () => {
      render(<RobotReplay gridId="g1" cells={CELLS} onDone={() => {}} />);
    });
    expect(screen.getByText(/aucun mot/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — verify they fail**

```bash
cd client && npx vitest run src/screens/RobotReplay.test.jsx
```
Expected: FAIL — `Cannot find module './RobotReplay.jsx'`

- [ ] **Step 3: Implement `client/src/screens/RobotReplay.jsx`**

```jsx
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid } from "../components/Grid.jsx";
import { fetchSolution } from "../api.js";
import { useRobotReplay } from "../hooks/useRobotReplay.js";

export function RobotReplay({ gridId, cells, onDone }) {
  const [solutions, setSolutions] = useState(null);
  const [error, setError] = useState(null);

  const { play, skip, activeIndices, currentEntry, wordIndex, total, done } =
    useRobotReplay({ solutions: solutions ?? [] });

  useEffect(() => {
    fetchSolution(gridId)
      .then(({ solutions: s }) => setSolutions(s))
      .catch(() => setError("Grille expirée, solution indisponible."));
  }, [gridId]);

  useEffect(() => {
    if (solutions === null) return;
    if (solutions.length === 0) return;
    play();
  }, [solutions]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
  }, [done]);

  if (error) {
    return (
      <section className="flex flex-col items-center gap-4 max-w-md mx-auto">
        <p className="text-danger">{error}</p>
        <button onClick={onDone} className="bg-surface px-6 py-2 rounded-lg">
          Retour
        </button>
      </section>
    );
  }

  if (!solutions) {
    return <p className="text-center text-text-muted">Calcul en cours…</p>;
  }

  if (solutions.length === 0) {
    return <p className="text-center text-text-muted">Aucun mot valide trouvé.</p>;
  }

  return (
    <section className="flex flex-col gap-4 max-w-xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="font-display font-bold text-xl">Solution du robot</h2>
        <button
          onClick={() => { skip(); onDone(); }}
          className="text-text-muted underline text-sm"
        >
          Passer →
        </button>
      </div>

      <Grid
        cells={cells}
        path={[]}
        robotPath={[...activeIndices]}
        onTap={() => {}}
      />

      <div className="h-10 flex items-center justify-between px-1">
        <AnimatePresence mode="wait">
          {currentEntry && (
            <motion.span
              key={currentEntry.word}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="font-display font-bold text-2xl text-amber-400"
            >
              {currentEntry.word}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="text-text-muted text-sm tabular">
          {currentEntry ? `+${currentEntry.score} · ` : ""}mot {wordIndex + 1} / {total}
        </span>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run — verify all pass**

```bash
cd client && npx vitest run src/screens/RobotReplay.test.jsx
```
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/screens/RobotReplay.jsx client/src/screens/RobotReplay.test.jsx
git commit -m "feat(client): RobotReplay screen with animated word-by-word tile reveal"
```

---

## Phase 4 — Wiring

### Task 7: Wire Game → End → App → RobotReplay

**Files:**
- Modify: `client/src/screens/Game.jsx` (pass `gridId` + `cells` in `onEnd`)
- Modify: `client/src/screens/End.jsx` (add `gridId` + `onRobotReplay` props)
- Modify: `client/src/App.jsx` (add `"robot"` screen, store `gameResult`)

- [ ] **Step 1: Update `client/src/screens/Game.jsx`**

Change only the `onEnd` call to include `gridId` and `cells`. Find the line:

```js
    onEnd: () => onEnd({ words, total: words.reduce((s, w) => s + w.score, 0) }),
```

Replace with:

```js
    onEnd: () => onEnd({ words, total: words.reduce((s, w) => s + w.score, 0), gridId: grid?.gridId, cells: grid?.cells }),
```

- [ ] **Step 2: Update `client/src/screens/End.jsx`**

Replace the full file:

```jsx
import { useEffect, useState } from "react";
import { EndForm } from "../components/EndForm.jsx";
import { Leaderboard } from "../components/Leaderboard.jsx";
import { submitScore, fetchLeaderboard } from "../api.js";

export function End({ total, gridId, onRestart, onMenu, onRobotReplay }) {
  const [submitted, setSubmitted] = useState(false);
  const [rank, setRank] = useState(null);
  const [board, setBoard] = useState([]);

  useEffect(() => { if (submitted) fetchLeaderboard(20).then(setBoard); }, [submitted]);

  async function handleSubmit(pseudo) {
    const r = await submitScore({ pseudo, score: total });
    setRank(r.rank);
    setSubmitted(true);
  }

  if (!submitted) {
    return (
      <div className="flex flex-col gap-4 max-w-md mx-auto">
        <EndForm score={total} onSubmit={handleSubmit} />
        {gridId && onRobotReplay && (
          <button
            onClick={onRobotReplay}
            className="text-text-muted underline text-sm text-center"
          >
            Voir la solution du robot
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="max-w-md mx-auto flex flex-col gap-4">
      <h2 className="font-display text-2xl">Classement</h2>
      <p className="text-text-muted">Ton rang : <span className="text-accent font-bold">#{rank}</span></p>
      <Leaderboard rows={board} />
      <div className="flex gap-2 justify-center">
        <button onClick={onRestart} className="bg-primary text-bg px-6 py-2 rounded-lg font-bold">Rejouer</button>
        <button onClick={onMenu} className="bg-surface px-6 py-2 rounded-lg">Menu</button>
      </div>
      {gridId && onRobotReplay && (
        <button
          onClick={onRobotReplay}
          className="text-text-muted underline text-sm text-center"
        >
          Voir la solution du robot
        </button>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Update `client/src/App.jsx`**

Replace the full file:

```jsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "./screens/Menu.jsx";
import { Game } from "./screens/Game.jsx";
import { End } from "./screens/End.jsx";
import { LeaderboardScreen } from "./screens/LeaderboardScreen.jsx";
import { RobotReplay } from "./screens/RobotReplay.jsx";

const SCREEN = { duration: 0.25, ease: [0.22, 1, 0.36, 1] };

function Screen({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={SCREEN}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [gameResult, setGameResult] = useState({ total: 0, gridId: null, cells: [] });

  function handleGameEnd({ total, gridId, cells }) {
    setGameResult({ total, gridId: gridId ?? null, cells: cells ?? [] });
    setScreen("end");
  }

  return (
    <main className="min-h-dvh px-4 py-6 md:py-10 bg-bg text-text-base">
      <AnimatePresence mode="wait">
        {screen === "menu" && (
          <Screen key="menu">
            <Menu onPlay={() => setScreen("game")} onLeaderboard={() => setScreen("leaderboard")} />
          </Screen>
        )}
        {screen === "game" && (
          <Screen key="game">
            <Game onEnd={handleGameEnd} />
          </Screen>
        )}
        {screen === "end" && (
          <Screen key="end">
            <End
              total={gameResult.total}
              gridId={gameResult.gridId}
              onRestart={() => setScreen("game")}
              onMenu={() => setScreen("menu")}
              onRobotReplay={() => setScreen("robot")}
            />
          </Screen>
        )}
        {screen === "leaderboard" && (
          <Screen key="leaderboard">
            <LeaderboardScreen onMenu={() => setScreen("menu")} />
          </Screen>
        )}
        {screen === "robot" && (
          <Screen key="robot">
            <RobotReplay
              gridId={gameResult.gridId}
              cells={gameResult.cells}
              onDone={() => setScreen("end")}
            />
          </Screen>
        )}
      </AnimatePresence>
    </main>
  );
}
```

- [ ] **Step 4: Run full client test suite — verify all pass**

```bash
cd client && npx vitest run
```
Expected: all tests pass.

- [ ] **Step 5: Run full server test suite — verify all pass**

```bash
cd server && npx vitest run
```
Expected: all tests pass.

- [ ] **Step 6: Run lint**

```bash
cd .. && pnpm lint
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/screens/Game.jsx client/src/screens/End.jsx client/src/App.jsx
git commit -m "feat(client): wire robot replay — Game→End→App→RobotReplay flow"
```

---

## Final verification

- [ ] Run `pnpm test && pnpm lint && pnpm build` from repo root — all green, `client/dist/` emits.
- [ ] Provide `server/data/dict.txt`, run `pnpm dev`, play a full game, click "Voir la solution du robot" — robot replays all words with gold tile animations.
- [ ] Click "Passer →" — returns to End screen immediately.
- [ ] Toggle `prefers-reduced-motion` in OS/DevTools — tiles appear all at once with no stagger.
