# Polish — Animations, Logo & Robot UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five client-side improvements — slower robot replay, luminous tile trail + glow pulse for robot, progressive solution list, game word-found flash/score animation, and animated SVG logo on the Menu screen.

**Architecture:** No server changes. All changes are in `client/src`. The core refactor is replacing `activeIndices` (Set) in `useRobotReplay` with `stepIndex` (number) so Grid can compute per-tile trail opacity. A new `FloatingScore` component overlays the game grid. A new `RuzzleLogo` SVG component replaces the plain `<h1>` in Menu.

**Tech Stack:** React + Framer Motion + Vitest/RTL, pnpm monorepo.

**Reference spec:** `docs/superpowers/specs/2026-05-19-polish-animations-logo.md`

---

## File map

| Action | File | Purpose |
|---|---|---|
| Modify | `client/src/hooks/useRobotReplay.js` | New timing constants; replace `activeIndices` with `stepIndex` React state; expose `isHolding` |
| Modify | `client/src/hooks/useRobotReplay.test.js` | Update timing expectations; replace `activeIndices` checks with `stepIndex`; add `isHolding` test |
| Modify | `client/src/components/Tile.jsx` | Replace `robotSelected` prop with `robotTrailOpacity`+`robotPulsing`; add `flashing` prop |
| Modify | `client/src/components/Tile.test.jsx` | Update robot test; add flashing test |
| Modify | `client/src/components/Grid.jsx` | Accept `robotPath` (ordered array), `stepIndex`, `isHolding`, `flashPath`; compute per-tile props |
| Modify | `client/src/components/Grid.test.jsx` | Update robot test for new props; add flash test |
| Modify | `client/src/screens/RobotReplay.jsx` | Use `stepIndex`/`isHolding` from hook; pass ordered `robotPath`; progressive solution list |
| Modify | `client/src/screens/RobotReplay.test.jsx` | Add progressive-list test |
| Modify | `client/src/screens/Game.jsx` | Add `flashPath` state + `FloatingScore` |
| Create | `client/src/components/FloatingScore.jsx` | Animated `+N` score float |
| Create | `client/src/components/RuzzleLogo.jsx` | SVG 3×2 tile grid spelling R-U-Z-Z-L-E with CSS animations |
| Modify | `client/src/screens/Menu.jsx` | Replace `<h1>` with `<RuzzleLogo />` |
| Modify | `client/src/styles/index.css` | Add `tile-pop` + `logo-glow` keyframes |

---

## Phase 1 — Robot hook refactor + timing

### Task 1: New timing constants + refactor `useRobotReplay` (TDD)

**Files:**
- Modify: `client/src/hooks/useRobotReplay.js`
- Modify: `client/src/hooks/useRobotReplay.test.js`

**Background:** The hook currently exposes `activeIndices: Set<number>` which Grid spreads into `robotPath`. We replace this with `stepIndex: number` (how many tiles of the current word have been revealed, 0 = none, `path.length` = all shown / hold phase, `path.length + 1` = clearing). Grid will use `stepIndex` + the ordered `robotPath` to compute per-tile trail opacities. `isHolding` is derived: `currentEntry !== null && stepIndex === currentEntry.path.length`.

New timing constants: `STAGGER_MS = 200`, `HOLD_MS = 900`, `CLEAR_MS = 400`, `GAP_MS = 250`.

For a 2-tile word (path length 2): `200 + 200 + 900 + 400 + 250 = 1950ms` total.

- [ ] **Step 1: Rewrite `useRobotReplay.test.js`**

Replace the entire file:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRobotReplay } from "./useRobotReplay.js";

const SOLUTIONS = [
  { word: "AB", path: [0, 1], score: 5 },
  { word: "CD", path: [2, 3], score: 3 },
];

describe("useRobotReplay", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts idle with stepIndex 0 and not done", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    expect(result.current.idle).toBe(true);
    expect(result.current.done).toBe(false);
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.currentEntry).toBeNull();
  });

  it("play() exits idle state", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    expect(result.current.idle).toBe(false);
  });

  it("skip() sets done and resets stepIndex", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => result.current.skip());
    expect(result.current.done).toBe(true);
    expect(result.current.stepIndex).toBe(0);
  });

  it("after 200ms, stepIndex is 1 (first tile revealed)", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.currentEntry?.word).toBe("AB");
  });

  it("after 400ms, stepIndex is 2 (both tiles revealed)", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current.stepIndex).toBe(2);
  });

  it("isHolding = true when stepIndex equals path length (after 400ms)", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current.isHolding).toBe(true);
  });

  it("after first word completes (1950ms), moves to second word", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    // 200+200+900+400+250 = 1950ms
    act(() => { vi.advanceTimersByTime(1950); });
    expect(result.current.currentEntry?.word).toBe("CD");
  });

  it("done after all words finish", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(4000); });
    expect(result.current.done).toBe(true);
    expect(result.current.stepIndex).toBe(0);
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

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd client && npx vitest run src/hooks/useRobotReplay.test.js
```
Expected: multiple failures — timing mismatches and `activeIndices` references.

- [ ] **Step 3: Rewrite `useRobotReplay.js`**

Replace the entire file:

```js
import { useState, useRef, useCallback, useEffect } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion.js";

const STAGGER_MS = 200;
const HOLD_MS = 900;
const CLEAR_MS = 400;
const GAP_MS = 250;
const REDUCED_HOLD_MS = 800;

export function useRobotReplay({ solutions }) {
  const [currentEntry, setCurrentEntry] = useState(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [idle, setIdle] = useState(true);
  const reduced = usePrefersReducedMotion();

  const timerRef = useRef(null);
  const stateRef = useRef({ wordIndex: 0, stepIndex: 0, running: false });
  const runStepRef = useRef(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  const runStep = useCallback(() => {
    const { wordIndex: wi, stepIndex: si } = stateRef.current;

    if (wi >= solutions.length) {
      setCurrentEntry(null);
      setStepIndex(0);
      setDone(true);
      stateRef.current.running = false;
      return;
    }

    const entry = solutions[wi];
    const path = entry.path;

    setCurrentEntry(entry);
    setWordIndex(wi);

    if (reduced) {
      // Show all tiles at once, then clear after hold
      stateRef.current.stepIndex = path.length;
      setStepIndex(path.length);
      timerRef.current = setTimeout(() => {
        stateRef.current.stepIndex = path.length + 1;
        setStepIndex(path.length + 1);
        timerRef.current = setTimeout(() => {
          stateRef.current.wordIndex += 1;
          stateRef.current.stepIndex = 0;
          setStepIndex(0);
          runStepRef.current?.();
        }, GAP_MS);
      }, REDUCED_HOLD_MS);
      return;
    }

    if (si < path.length) {
      // Reveal next tile
      timerRef.current = setTimeout(() => {
        stateRef.current.stepIndex += 1;
        setStepIndex(stateRef.current.stepIndex);
        runStepRef.current?.();
      }, STAGGER_MS);
    } else if (si === path.length) {
      // Hold: all tiles visible, wait before clearing
      timerRef.current = setTimeout(() => {
        stateRef.current.stepIndex += 1;
        setStepIndex(stateRef.current.stepIndex); // path.length + 1 = clear signal
        runStepRef.current?.();
      }, HOLD_MS);
    } else {
      // Clear: stepIndex > path.length — Grid already shows opacity 0
      timerRef.current = setTimeout(() => {
        timerRef.current = setTimeout(() => {
          stateRef.current.wordIndex += 1;
          stateRef.current.stepIndex = 0;
          setWordIndex(stateRef.current.wordIndex);
          setStepIndex(0);
          runStepRef.current?.();
        }, GAP_MS);
      }, CLEAR_MS);
    }
  }, [solutions, reduced]);

  useEffect(() => { runStepRef.current = runStep; }, [runStep]);

  const play = useCallback(() => {
    clearTimer();
    stateRef.current = { wordIndex: 0, stepIndex: 0, running: true };
    setDone(false);
    setIdle(false);
    setStepIndex(0);
    setCurrentEntry(solutions.length > 0 ? solutions[0] : null);
    setWordIndex(0);
    runStep();
  }, [solutions, runStep]);

  function skip() {
    clearTimer();
    stateRef.current.running = false;
    setStepIndex(0);
    setCurrentEntry(null);
    setDone(true);
    setIdle(false);
  }

  const isHolding = currentEntry !== null && stepIndex === currentEntry.path.length;

  return {
    play,
    skip,
    stepIndex,
    isHolding,
    currentEntry,
    wordIndex,
    total: solutions.length,
    done,
    idle,
  };
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
cd client && npx vitest run src/hooks/useRobotReplay.test.js
```
Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useRobotReplay.js client/src/hooks/useRobotReplay.test.js
git commit -m "feat(robot): refactor useRobotReplay — stepIndex/isHolding, slower timing"
```

---

## Phase 2 — Tile + Grid visual overhaul

### Task 2: Tile — new visual props (TDD)

**Files:**
- Modify: `client/src/components/Tile.jsx`
- Modify: `client/src/components/Tile.test.jsx`

**Background:** `Tile` currently has `robotSelected: boolean`. We replace it with:
- `robotTrailOpacity: number` — 0 = not in robot path, 0.15/0.4/0.65/1 = trail depth (amber bg, opacity controlled by Framer Motion)
- `robotPulsing: boolean` — pulsing glow during hold phase (scale + brightness keyframes, loops)
- `flashing: boolean` — green flash + bounce when game word is validated (resets after 500ms from Game)

When `robotTrailOpacity = 0` and tile was previously in path, Framer Motion animates opacity back to 1.

- [ ] **Step 1: Update `Tile.test.jsx`**

Replace the entire file:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tile } from "./Tile.jsx";

describe("Tile", () => {
  it("renders letter", () => {
    render(<Tile letter="A" bonus={null} index={0} selected={false} onTap={() => {}} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });
  it("renders bonus badge", () => {
    render(<Tile letter="A" bonus="DL" index={0} selected={false} onTap={() => {}} />);
    expect(screen.getByText("DL")).toBeInTheDocument();
  });
  it("calls onTap with index when clicked", async () => {
    const onTap = vi.fn();
    render(<Tile letter="A" bonus={null} index={5} selected={false} onTap={onTap} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onTap).toHaveBeenCalledWith(5);
  });
  it("has aria-label including letter and bonus", () => {
    render(<Tile letter="A" bonus="TW" index={0} selected={false} onTap={() => {}} />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toMatch(/A/);
    expect(screen.getByRole("button").getAttribute("aria-label")).toMatch(/triple.*word/i);
  });
  it("shows amber class when robotTrailOpacity > 0", () => {
    render(<Tile letter="A" bonus={null} index={0} selected={false} robotTrailOpacity={1} onTap={() => {}} />);
    expect(screen.getByRole("button").className).toMatch(/amber/);
  });
  it("shows success class when flashing", () => {
    render(<Tile letter="A" bonus={null} index={0} selected={false} flashing={true} onTap={() => {}} />);
    expect(screen.getByRole("button").className).toMatch(/success/);
  });
  it("shows normal class when robotTrailOpacity is 0 and not flashing", () => {
    render(<Tile letter="A" bonus={null} index={0} selected={false} robotTrailOpacity={0} onTap={() => {}} />);
    expect(screen.getByRole("button").className).not.toMatch(/amber/);
    expect(screen.getByRole("button").className).not.toMatch(/success/);
  });
});
```

- [ ] **Step 2: Run tests — verify the new tests fail**

```bash
cd client && npx vitest run src/components/Tile.test.jsx
```
Expected: the 2 new tests ("shows amber when robotTrailOpacity > 0" and "shows success when flashing") fail; existing tests pass.

- [ ] **Step 3: Rewrite `Tile.jsx`**

Replace the entire file:

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

export const tileVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Tile({
  letter,
  bonus,
  index,
  selected,
  robotTrailOpacity = 0,
  robotPulsing = false,
  flashing = false,
  onTap,
}) {
  const reduced = usePrefersReducedMotion();
  const ariaLabel = `Letter ${letter}${bonus ? `, ${BONUS_LABEL[bonus]} bonus` : ""}`;

  let bgClass;
  if (flashing) {
    bgClass = "bg-success text-bg ring-2 ring-success";
  } else if (robotTrailOpacity > 0) {
    bgClass =
      "bg-amber-400 text-black" +
      (robotTrailOpacity === 1 ? " ring-2 ring-amber-200" : "");
  } else if (selected) {
    bgClass =
      "bg-primary text-bg ring-2 ring-accent shadow-[0_0_16px_rgba(139,92,246,0.6)]";
  } else {
    bgClass = "bg-surface-2 text-text-base hover:bg-surface";
  }

  let animateProps;
  let transitionProps;

  if (flashing && !reduced) {
    animateProps = { scale: [1, 1.3, 0.95, 1], opacity: 1 };
    transitionProps = { duration: 0.45, ease: "easeOut" };
  } else if (robotPulsing && !reduced) {
    animateProps = {
      scale: [1.12, 1.2, 1.12],
      filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
      opacity: 1,
    };
    transitionProps = { duration: 0.5, repeat: Infinity, ease: "easeInOut" };
  } else if (robotTrailOpacity > 0 && !reduced) {
    animateProps = {
      scale: robotTrailOpacity === 1 ? 1.12 : 1,
      opacity: robotTrailOpacity,
    };
    transitionProps = {
      opacity: { duration: 0.15, ease: "easeOut" },
      scale: { type: "spring", stiffness: 400, damping: 18 },
    };
  } else {
    animateProps = { scale: 1, opacity: 1 };
    transitionProps = {
      opacity: { duration: 0.15, ease: "easeOut" },
      scale: SPRING,
    };
  }

  return (
    <motion.button
      type="button"
      onClick={() => onTap(index)}
      aria-label={ariaLabel}
      aria-pressed={selected}
      variants={reduced ? undefined : tileVariants}
      animate={animateProps}
      transition={transitionProps}
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
        <span
          className={`absolute top-1 right-1 text-[10px] font-bold px-1 py-0.5 rounded-md text-white ${BONUS_BG[bonus]}`}
        >
          {bonus}
        </span>
      )}
    </motion.button>
  );
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
cd client && npx vitest run src/components/Tile.test.jsx
```
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Tile.jsx client/src/components/Tile.test.jsx
git commit -m "feat(client): Tile — robotTrailOpacity, robotPulsing, flashing props"
```

---

### Task 3: Grid — compute trail depths + flash (TDD)

**Files:**
- Modify: `client/src/components/Grid.jsx`
- Modify: `client/src/components/Grid.test.jsx`

**Background:** Grid now receives:
- `robotPath: number[]` — **ordered** path array (full path of current word, from `currentEntry.path`)
- `stepIndex: number` — how many tiles revealed (0..`path.length` = reveal/hold, `path.length+1` = clear)
- `isHolding: boolean` — true during hold phase (all tiles full opacity + pulsing)
- `flashPath: number[]` — indices of just-validated game tiles (non-empty for ~500ms)

Trail depth logic per tile `i`:
```
posInPath = robotPath.indexOf(i)         // -1 if not in path
isClearing = stepIndex > robotPath.length
revealed = posInPath !== -1 && posInPath < stepIndex && !isClearing

if revealed && isHolding  → opacity=1, pulsing=true
if revealed && !isHolding → depth = (stepIndex-1) - posInPath
                            depth 0 → 1.0, depth 1 → 0.65, depth 2 → 0.4, depth 3+ → 0.15
else                      → opacity=0 (not in path or clearing)
```

- [ ] **Step 1: Update `Grid.test.jsx`**

Replace the entire file:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Grid } from "./Grid.jsx";

const cells = Array.from({ length: 16 }, (_, i) => ({
  letter: String.fromCharCode(65 + i),
  bonus: null,
}));

describe("Grid", () => {
  it("renders 16 tiles", () => {
    render(<Grid cells={cells} path={[]} onTap={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(16);
  });

  it("calls onTap with cell index", async () => {
    const onTap = vi.fn();
    render(<Grid cells={cells} path={[]} onTap={onTap} />);
    await userEvent.click(screen.getAllByRole("button")[3]);
    expect(onTap).toHaveBeenCalledWith(3);
  });

  it("marks tiles in path as selected", () => {
    render(<Grid cells={cells} path={[0, 1]} onTap={() => {}} />);
    expect(screen.getAllByRole("button")[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button")[2]).toHaveAttribute("aria-pressed", "false");
  });

  it("shows amber on tiles within stepIndex of robotPath", () => {
    // robotPath=[2,5], stepIndex=2 → both tiles 2 and 5 revealed
    render(
      <Grid
        cells={cells}
        path={[]}
        robotPath={[2, 5]}
        stepIndex={2}
        isHolding={false}
        onTap={() => {}}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[2].className).toMatch(/amber/);
    expect(buttons[5].className).toMatch(/amber/);
    expect(buttons[0].className).not.toMatch(/amber/);
  });

  it("shows no amber when stepIndex=0 (no tiles revealed yet)", () => {
    render(
      <Grid
        cells={cells}
        path={[]}
        robotPath={[2, 5]}
        stepIndex={0}
        isHolding={false}
        onTap={() => {}}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[2].className).not.toMatch(/amber/);
    expect(buttons[5].className).not.toMatch(/amber/);
  });

  it("shows success class on flashing tiles", () => {
    render(<Grid cells={cells} path={[]} flashPath={[0, 3]} onTap={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0].className).toMatch(/success/);
    expect(buttons[3].className).toMatch(/success/);
    expect(buttons[1].className).not.toMatch(/success/);
  });
});
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
cd client && npx vitest run src/components/Grid.test.jsx
```
Expected: "shows amber on tiles within stepIndex", "shows no amber when stepIndex=0", and "shows success on flashing tiles" fail.

- [ ] **Step 3: Rewrite `Grid.jsx`**

Replace the entire file:

```jsx
import { motion } from "framer-motion";
import { Tile } from "./Tile.jsx";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.018 } },
};

function trailOpacity(posInPath, stepIndex) {
  const depth = stepIndex - 1 - posInPath;
  if (depth === 0) return 1;
  if (depth === 1) return 0.65;
  if (depth === 2) return 0.4;
  return 0.15;
}

export function Grid({
  cells,
  path,
  robotPath = [],
  stepIndex = 0,
  isHolding = false,
  flashPath = [],
  onTap,
}) {
  const reduced = usePrefersReducedMotion();
  const selected = new Set(path);
  const flashing = new Set(flashPath);
  const isClearing = stepIndex > robotPath.length;

  return (
    <motion.div
      className="grid grid-cols-4 gap-2 w-full max-w-[480px] aspect-square mx-auto p-2 rounded-2xl bg-surface/40"
      role="group"
      aria-label="Ruzzle grid"
      variants={reduced ? undefined : gridVariants}
      initial={reduced ? false : "hidden"}
      animate="visible"
    >
      {cells.map((c, i) => {
        const posInPath = robotPath.indexOf(i);
        const revealed =
          posInPath !== -1 && posInPath < stepIndex && !isClearing;

        const robotTrailOpacity = revealed
          ? isHolding
            ? 1
            : trailOpacity(posInPath, stepIndex)
          : 0;

        const robotPulsing = revealed && isHolding;

        return (
          <Tile
            key={i}
            letter={c.letter}
            bonus={c.bonus}
            index={i}
            selected={selected.has(i)}
            robotTrailOpacity={robotTrailOpacity}
            robotPulsing={robotPulsing}
            flashing={flashing.has(i)}
            onTap={onTap}
          />
        );
      })}
    </motion.div>
  );
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
cd client && npx vitest run src/components/Grid.test.jsx
```
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Grid.jsx client/src/components/Grid.test.jsx
git commit -m "feat(client): Grid — trail depth + pulsing + flash props"
```

---

## Phase 3 — Robot screen wiring + progressive list

### Task 4: Wire RobotReplay to new hook API + progressive list (TDD)

**Files:**
- Modify: `client/src/screens/RobotReplay.jsx`
- Modify: `client/src/screens/RobotReplay.test.jsx`

**Background:**
- Hook no longer returns `activeIndices`; replace with `stepIndex` + `isHolding`.
- Grid now needs an ordered `robotPath` (use `currentEntry?.path ?? []`), `stepIndex`, `isHolding`.
- Progressive list: `revealedSolutions = done ? solutions : solutions.slice(0, wordIndex + 1)`. The active item is always the last in `revealedSolutions` (when not done). Each entry slides in via `AnimatePresence`.
- `SolutionList` is simplified: it receives only `revealedSolutions` and `done`. Active = last item when `!done`.

- [ ] **Step 1: Add failing test to `RobotReplay.test.jsx`**

Open `client/src/screens/RobotReplay.test.jsx` and append inside the `describe("RobotReplay", ...)` block:

```jsx
  it("shows only revealed words in solution list initially (progressive reveal)", async () => {
    api.fetchSolution.mockResolvedValue({
      solutions: [
        { word: "AB", path: [0, 1], score: 5 },
        { word: "CD", path: [2, 3], score: 3 },
      ],
    });
    await act(async () => {
      render(<RobotReplay gridId="g1" cells={CELLS} onDone={() => {}} />);
    });
    // wordIndex = 0 → revealedSolutions = [AB] only
    expect(screen.queryByText("CD")).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests — verify new test fails**

```bash
cd client && npx vitest run src/screens/RobotReplay.test.jsx
```
Expected: "shows only revealed words" fails (currently all words are rendered immediately). Other tests may also fail since `activeIndices` is gone from the hook.

- [ ] **Step 3: Rewrite `RobotReplay.jsx`**

Replace the entire file:

```jsx
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid } from "../components/Grid.jsx";
import { fetchSolution } from "../api.js";
import { useRobotReplay } from "../hooks/useRobotReplay.js";

function SolutionList({ solutions, done }) {
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView?.({
      block: "nearest",
      behavior: "smooth",
    });
  }, [solutions.length]);

  return (
    <div
      ref={listRef}
      className="flex flex-col gap-1 overflow-y-auto max-h-[480px] pr-1"
    >
      <AnimatePresence>
        {solutions.map((s, i) => {
          const isActive = !done && i === solutions.length - 1;
          return (
            <motion.div
              key={s.word}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={[
                "flex justify-between items-center px-3 py-1.5 rounded-lg text-sm",
                isActive
                  ? "bg-amber-400/20 text-amber-400 font-bold"
                  : "text-text-muted",
              ].join(" ")}
            >
              <span className="font-display">{s.word}</span>
              <span className="tabular-nums text-xs">+{s.score}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function RobotReplay({ gridId, cells, onDone }) {
  const [solutions, setSolutions] = useState(null);
  const [error, setError] = useState(null);

  const {
    play,
    skip,
    stepIndex,
    isHolding,
    currentEntry,
    wordIndex,
    total,
    done,
  } = useRobotReplay({ solutions: solutions ?? [] });

  useEffect(() => {
    fetchSolution(gridId)
      .then(({ solutions: s }) => setSolutions(s))
      .catch(() => setError("Grille expirée, solution indisponible."));
  }, [gridId]);

  useEffect(() => {
    if (solutions === null) return;
    if (solutions.length === 0) return;
    play();
  }, [solutions, play]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
  }, [done, onDone]);

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

  const revealedSolutions = done ? solutions : solutions.slice(0, wordIndex + 1);

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_260px] max-w-5xl mx-auto">
      <div className="flex flex-col gap-3">
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
          robotPath={currentEntry?.path ?? []}
          stepIndex={stepIndex}
          isHolding={isHolding}
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
          <span className="text-text-muted text-sm tabular-nums">
            {currentEntry ? `+${currentEntry.score} · ` : ""}mot {wordIndex + 1} / {total}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-display font-bold text-sm text-text-muted uppercase tracking-wide">
          Mots trouvés
        </h3>
        <SolutionList solutions={revealedSolutions} done={done} />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run all RobotReplay tests**

```bash
cd client && npx vitest run src/screens/RobotReplay.test.jsx
```
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/screens/RobotReplay.jsx client/src/screens/RobotReplay.test.jsx
git commit -m "feat(robot): progressive solution list + wire stepIndex/isHolding to Grid"
```

---

## Phase 4 — Game word-found animation

### Task 5: FloatingScore component (TDD)

**Files:**
- Create: `client/src/components/FloatingScore.jsx`

- [ ] **Step 1: Create `FloatingScore.test.jsx`**

Create `client/src/components/FloatingScore.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FloatingScore } from "./FloatingScore.jsx";

describe("FloatingScore", () => {
  it("renders +N when score is set", () => {
    render(<FloatingScore score={12} scoreKey={1} />);
    expect(screen.getByText("+12")).toBeInTheDocument();
  });

  it("renders nothing when score is null", () => {
    const { container } = render(<FloatingScore score={null} scoreKey={0} />);
    expect(container.textContent).toBe("");
  });
});
```

- [ ] **Step 2: Run — verify they fail**

```bash
cd client && npx vitest run src/components/FloatingScore.test.jsx
```
Expected: FAIL — `Cannot find module './FloatingScore.jsx'`

- [ ] **Step 3: Create `FloatingScore.jsx`**

```jsx
import { AnimatePresence, motion } from "framer-motion";

export function FloatingScore({ score, scoreKey }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
      <AnimatePresence mode="wait">
        {score !== null && (
          <motion.span
            key={scoreKey}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -48, scale: 1.2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="font-display font-bold text-3xl text-success"
          >
            +{score}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd client && npx vitest run src/components/FloatingScore.test.jsx
```
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/FloatingScore.jsx client/src/components/FloatingScore.test.jsx
git commit -m "feat(client): FloatingScore component"
```

---

### Task 6: Wire flash + FloatingScore into Game

**Files:**
- Modify: `client/src/screens/Game.jsx`

No new tests needed — Game is an integration component tested via manual play. The flash logic is simple state management.

- [ ] **Step 1: Update `Game.jsx`**

Replace the entire file:

```jsx
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid } from "../components/Grid.jsx";
import { Timer } from "../components/Timer.jsx";
import { WordList } from "../components/WordList.jsx";
import { FloatingScore } from "../components/FloatingScore.jsx";
import { usePathSelection } from "../hooks/usePathSelection.js";
import { useTimer } from "../hooks/useTimer.js";
import { fetchGrid, validateWord } from "../api.js";

const DURATION = 120_000;

export function Game({ onEnd }) {
  const [grid, setGrid] = useState(null);
  const [words, setWords] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [flashPath, setFlashPath] = useState([]);
  const [floatingScore, setFloatingScore] = useState(null);
  const [scoreKey, setScoreKey] = useState(0);
  const { path, tap, reset } = usePathSelection();
  const { remainingMs, running, start } = useTimer({
    durationMs: DURATION,
    onEnd: () =>
      onEnd({
        words,
        total: words.reduce((s, w) => s + w.score, 0),
        gridId: grid?.gridId,
        cells: grid?.cells,
      }),
  });

  useEffect(() => { fetchGrid().then(setGrid); }, []);

  function handleTap(i) {
    if (!running) start();
    tap(i);
  }

  async function submit() {
    if (!grid || path.length < 2) { reset(); return; }
    const word = path.map((i) => grid.cells[i].letter).join("");
    if (words.some((w) => w.word === word)) {
      setFeedback({ type: "dup", word });
      reset();
      return;
    }
    try {
      const r = await validateWord({ gridId: grid.gridId, path, word });
      if (r.valid) {
        setWords((arr) => [...arr, { word, score: r.score }]);
        setFeedback({ type: "ok", word, score: r.score });
        // Flash tiles + floating score
        setFlashPath([...path]);
        setFloatingScore(r.score);
        setScoreKey((k) => k + 1);
        setTimeout(() => setFlashPath([]), 500);
        setTimeout(() => setFloatingScore(null), 650);
      } else {
        setFeedback({ type: "no", word });
      }
    } catch (e) {
      setFeedback({ type: "err", message: e.message });
    }
    reset();
  }

  if (!grid) return <p>Chargement…</p>;

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px] max-w-5xl mx-auto">
      <div className="flex flex-col gap-3">
        <Timer remainingMs={remainingMs} totalMs={DURATION} />
        <div className="relative">
          <Grid
            cells={grid.cells}
            path={path}
            flashPath={flashPath}
            onTap={handleTap}
          />
          <FloatingScore score={floatingScore} scoreKey={scoreKey} />
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={submit}
            className="bg-primary text-bg font-display font-bold px-6 py-2 rounded-lg"
          >
            Valider
          </button>
          <button onClick={reset} className="bg-surface px-6 py-2 rounded-lg">
            Effacer
          </button>
        </div>
        <p role="status" aria-live="polite" className="text-center text-sm h-5">
          <AnimatePresence mode="wait">
            {feedback && (
              <motion.span
                key={`${feedback.type}-${feedback.word ?? ""}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="inline-block"
              >
                {feedback.type === "ok" && (
                  <span className="text-success">{feedback.word} +{feedback.score}</span>
                )}
                {feedback.type === "no" && (
                  <span className="text-danger">{feedback.word} — pas dans le dico</span>
                )}
                {feedback.type === "dup" && (
                  <span className="text-text-muted">{feedback.word} — déjà trouvé</span>
                )}
                {feedback.type === "err" && (
                  <span className="text-danger">{feedback.message}</span>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </p>
      </div>
      <WordList words={words} />
    </section>
  );
}
```

- [ ] **Step 2: Run full client test suite**

```bash
cd client && npx vitest run
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add client/src/screens/Game.jsx
git commit -m "feat(client): word-found flash + floating score animation"
```

---

## Phase 5 — Logo + Menu

### Task 7: Animated SVG logo + Menu (TDD)

**Files:**
- Create: `client/src/components/RuzzleLogo.jsx`
- Modify: `client/src/styles/index.css`
- Modify: `client/src/screens/Menu.jsx`

**Font:** `Space Grotesk` (from `tailwind.config.js` `fontFamily.display`). Used via `fontFamily="'Space Grotesk', sans-serif"` in SVG `<text>`.

**SVG dimensions:** tile 56×56px, gap 8px, 3 cols × 2 rows → width 184px, height 120px.

- [ ] **Step 1: Create `RuzzleLogo.test.jsx`**

Create `client/src/components/RuzzleLogo.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RuzzleLogo } from "./RuzzleLogo.jsx";

describe("RuzzleLogo", () => {
  it("renders all 6 letters R U Z Z L E", () => {
    render(<RuzzleLogo />);
    // SVG text elements are in the DOM
    expect(screen.getByText("R")).toBeInTheDocument();
    expect(screen.getByText("U")).toBeInTheDocument();
    expect(screen.getByText("Z")).toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(screen.getByText("E")).toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(<RuzzleLogo />);
    expect(screen.getByRole("img", { name: /ruzzle/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — verify they fail**

```bash
cd client && npx vitest run src/components/RuzzleLogo.test.jsx
```
Expected: FAIL — `Cannot find module './RuzzleLogo.jsx'`

- [ ] **Step 3: Add keyframes to `index.css`**

Open `client/src/styles/index.css` and replace the entire file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { -webkit-font-smoothing: antialiased; }
  body { font-feature-settings: "tnum" 0; }
  .tabular { font-variant-numeric: tabular-nums; }
}

@keyframes tile-pop {
  0%   { transform: scale(0.6); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes logo-glow {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(139, 92, 246, 0.3)); }
  50%       { filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.8)); }
}

.logo-tile-pop {
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  animation: tile-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.logo-svg-glow {
  animation: logo-glow 3s ease-in-out infinite;
  animation-delay: 0.7s;
}
```

- [ ] **Step 4: Create `RuzzleLogo.jsx`**

```jsx
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

const LETTERS = ["R", "U", "Z", "Z", "L", "E"];
const TILE = 56;
const GAP = 8;
const COLS = 3;
const W = COLS * TILE + (COLS - 1) * GAP; // 184
const H = 2 * TILE + GAP;                  // 120

export function RuzzleLogo() {
  const reduced = usePrefersReducedMotion();

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className={reduced ? "" : "logo-svg-glow"}
      aria-label="Ruzzle"
      role="img"
    >
      {LETTERS.map((letter, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = col * (TILE + GAP);
        const y = row * (TILE + GAP);

        return (
          <g
            key={i}
            className={reduced ? "" : "logo-tile-pop"}
            style={reduced ? {} : { animationDelay: `${i * 80}ms` }}
          >
            <rect
              x={x}
              y={y}
              width={TILE}
              height={TILE}
              rx={10}
              ry={10}
              fill="#241D40"
              stroke="#8B5CF6"
              strokeOpacity="0.45"
              strokeWidth="1.5"
            />
            <text
              x={x + TILE / 2}
              y={y + TILE / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#F4F1FF"
              fontSize="26"
              fontWeight="bold"
              fontFamily="'Space Grotesk', sans-serif"
            >
              {letter}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 5: Run logo tests — verify pass**

```bash
cd client && npx vitest run src/components/RuzzleLogo.test.jsx
```
Expected: 2 tests pass.

- [ ] **Step 6: Update `Menu.jsx`**

Replace the entire file:

```jsx
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";
import { RuzzleLogo } from "../components/RuzzleLogo.jsx";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

export function Menu({ onPlay, onLeaderboard }) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.section
      className="flex flex-col items-center gap-6 max-w-md mx-auto"
      variants={reduced ? undefined : container}
      initial={reduced ? false : "hidden"}
      animate="visible"
    >
      <motion.div variants={reduced ? undefined : item}>
        <RuzzleLogo />
      </motion.div>
      <motion.p
        variants={reduced ? undefined : item}
        className="text-text-muted text-sm tracking-widest uppercase"
      >
        FR
      </motion.p>
      <motion.p variants={reduced ? undefined : item} className="text-text-muted text-center">
        Trouve un maximum de mots en 2 minutes.
      </motion.p>
      <motion.button
        variants={reduced ? undefined : item}
        onClick={onPlay}
        className="bg-primary text-bg font-display font-bold px-8 py-3 rounded-xl text-lg"
      >
        Jouer
      </motion.button>
      <motion.button
        variants={reduced ? undefined : item}
        onClick={onLeaderboard}
        className="text-text-muted underline"
      >
        Voir le classement
      </motion.button>
    </motion.section>
  );
}
```

- [ ] **Step 7: Run full client + server suites + lint**

```bash
cd client && npx vitest run
```
Expected: all tests pass (including new RuzzleLogo tests).

```bash
cd server && npx vitest run
```
Expected: all 54 server tests still pass.

```bash
cd .. && pnpm lint
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/RuzzleLogo.jsx client/src/components/RuzzleLogo.test.jsx client/src/styles/index.css client/src/screens/Menu.jsx
git commit -m "feat(client): animated SVG logo on Menu screen"
```

---

## Final verification

- [ ] Run `pnpm test` from repo root — all green.
- [ ] Run `pnpm dev`, open browser, verify Menu logo: 6 tiles pop in one by one, then glow pulses.
- [ ] Play a game: validate a word → tiles flash green + score floats upward.
- [ ] End game, click "Voir la solution du robot" → tiles light up with amber trail as robot traces each word, hold with pulsing glow, solution list reveals word by word.
- [ ] Toggle `prefers-reduced-motion` in OS/DevTools — tile pop animation and logo glow are disabled; robot shows tiles all at once.
