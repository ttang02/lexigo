# Game Polish v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Six UX improvements — SVG connection trail, live score, collapsible bonus legend, animated end screen, consistent ghost buttons, and network error recovery.

**Architecture:** Purely additive changes. Server gains `countScores()` + `total` in POST /scores. Client gains one new component (`BonusLegend`) and targeted edits to `Grid`, `Game`, `End`, `Menu`. No existing APIs broken.

**Tech Stack:** React 18, Framer Motion 11, Tailwind CSS, Vitest + RTL, Express + node:sqlite

---

## File map

| Action | File |
|---|---|
| Modify | `server/src/db.js` — add `countScores()` |
| Modify | `server/src/app.js` — POST /scores returns `total` |
| Modify | `server/tests/routes.test.js` — assert `total` in response |
| Modify | `client/src/components/Grid.jsx` — SVG polyline overlay |
| Modify | `client/src/components/Grid.test.jsx` — polyline tests |
| Create | `client/src/components/BonusLegend.jsx` |
| Create | `client/src/components/BonusLegend.test.jsx` |
| Modify | `client/src/screens/Game.jsx` — live score + BonusLegend + network error |
| Modify | `client/src/screens/End.jsx` — animated score + rank phrase + ghost buttons |
| Modify | `client/src/screens/Menu.jsx` — ghost button |

---

## Task 1: Server — `countScores()` + `total` in POST /scores

**Files:**
- Modify: `server/src/db.js`
- Modify: `server/src/app.js`
- Modify: `server/tests/routes.test.js`

- [ ] **Step 1: Write the failing test**

Add to the `"POST /api/scores + GET /api/scores"` describe block in `server/tests/routes.test.js`:

```js
it("returns total player count in rank response", async () => {
  const { app } = makeApp();
  await request(app).post("/api/scores").send({ pseudo: "alice", score: 100 });
  await request(app).post("/api/scores").send({ pseudo: "bob", score: 50 });
  const r = await request(app).post("/api/scores").send({ pseudo: "carol", score: 75 });
  expect(r.status).toBe(200);
  expect(r.body.rank).toBe(2);
  expect(r.body.total).toBe(3);
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && npx vitest run tests/routes.test.js
```

Expected: FAIL — `r.body.total` is `undefined`.

- [ ] **Step 3: Add `countScores()` to `server/src/db.js`**

After the `existsStmt` line, add:

```js
const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM scores`);
```

In the returned object, add after `rankOf`:

```js
countScores() {
  return countStmt.get().total;
},
```

Full updated return block:

```js
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
```

- [ ] **Step 4: Update `POST /api/scores` in `server/src/app.js`**

Replace:
```js
db.upsertScore({ pseudo: cleanPseudo, score });
res.json({ ok: true, rank: db.rankOf(cleanPseudo) });
```

With:
```js
db.upsertScore({ pseudo: cleanPseudo, score });
const rank = db.rankOf(cleanPseudo);
const total = db.countScores();
res.json({ ok: true, rank, total });
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd server && npx vitest run tests/routes.test.js
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/db.js server/src/app.js server/tests/routes.test.js
git commit -m "feat(server): countScores + return total in POST /scores"
```

---

## Task 2: Grid — SVG connection trail

**Files:**
- Modify: `client/src/components/Grid.jsx`
- Modify: `client/src/components/Grid.test.jsx`

**Context:** The grid is `max-w-[480px] aspect-square` with `p-2` (8px) padding and `gap-2` (8px) gaps, 4 columns. Tile width = (480 − 16 − 24) / 4 = 110px. Stride = 118px. Tile center at index `i`: `cx = 8 + (i%4)*118 + 55`, `cy = 8 + floor(i/4)*118 + 55`.

- [ ] **Step 1: Write the failing tests**

Add to `client/src/components/Grid.test.jsx`:

```jsx
it("renders SVG polyline when path has 2 or more tiles", () => {
  render(<Grid cells={cells} path={[0, 1, 2]} onTap={() => {}} />);
  expect(document.querySelector("polyline")).toBeInTheDocument();
});

it("does not render polyline when path has fewer than 2 tiles", () => {
  render(<Grid cells={cells} path={[0]} onTap={() => {}} />);
  expect(document.querySelector("polyline")).not.toBeInTheDocument();
});

it("does not render polyline when path is empty", () => {
  render(<Grid cells={cells} path={[]} onTap={() => {}} />);
  expect(document.querySelector("polyline")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd client && npx vitest run src/components/Grid.test.jsx
```

Expected: 3 new tests FAIL — no polyline element exists.

- [ ] **Step 3: Add SVG overlay to `client/src/components/Grid.jsx`**

1. Add `relative` to the `motion.div` className:

```jsx
<motion.div
  className="relative grid grid-cols-4 gap-2 w-full max-w-[480px] aspect-square mx-auto p-2 rounded-2xl bg-surface/40"
  ...
>
```

2. After the `{cells.map(...)}` block, before the closing `</motion.div>`, add:

```jsx
{path.length >= 2 && !reduced && (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 480 480"
    preserveAspectRatio="xMidYMid meet"
  >
    <polyline
      points={path
        .map((i) => `${8 + (i % 4) * 118 + 55},${8 + Math.floor(i / 4) * 118 + 55}`)
        .join(" ")}
      fill="none"
      stroke="#8B5CF6"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.7"
    />
  </svg>
)}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd client && npx vitest run src/components/Grid.test.jsx
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Grid.jsx client/src/components/Grid.test.jsx
git commit -m "feat(grid): SVG polyline trail connecting selected tiles"
```

---

## Task 3: BonusLegend component

**Files:**
- Create: `client/src/components/BonusLegend.jsx`
- Create: `client/src/components/BonusLegend.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `client/src/components/BonusLegend.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BonusLegend } from "./BonusLegend.jsx";

describe("BonusLegend", () => {
  it("is closed by default — bonus codes not visible", () => {
    render(<BonusLegend />);
    expect(screen.queryByText("DL")).not.toBeInTheDocument();
    expect(screen.queryByText("TW")).not.toBeInTheDocument();
  });

  it("shows all 4 bonus codes when opened", async () => {
    render(<BonusLegend />);
    await userEvent.click(screen.getByRole("button"));
    for (const code of ["DL", "TL", "DW", "TW"]) {
      expect(screen.getByText(code)).toBeInTheDocument();
    }
  });

  it("hides bonus codes when closed again", async () => {
    render(<BonusLegend />);
    const btn = screen.getByRole("button");
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(screen.queryByText("DL")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd client && npx vitest run src/components/BonusLegend.test.jsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `client/src/components/BonusLegend.jsx`**

```jsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const BONUSES = [
  { code: "DL", label: "Lettre ×2", cls: "bg-bonus-dl" },
  { code: "TL", label: "Lettre ×3", cls: "bg-bonus-tl" },
  { code: "DW", label: "Mot ×2",    cls: "bg-bonus-dw" },
  { code: "TW", label: "Mot ×3",    cls: "bg-bonus-tw" },
];

export function BonusLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-text-muted text-xs font-display tracking-widest uppercase"
      >
        <span>? Bonus</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: "inline-block" }}
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-2">
              {BONUSES.map(({ code, label, cls }) => (
                <div key={code} className="flex items-center gap-2">
                  <span
                    className={`${cls} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md`}
                  >
                    {code}
                  </span>
                  <span className="text-text-muted">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd client && npx vitest run src/components/BonusLegend.test.jsx
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/BonusLegend.jsx client/src/components/BonusLegend.test.jsx
git commit -m "feat: BonusLegend collapsible component"
```

---

## Task 4: Game — live score + BonusLegend + network error recovery

**Files:**
- Modify: `client/src/screens/Game.jsx`

**Context:** Current `Game.jsx` has `useEffect(() => { fetchGrid().then(setGrid); }, [])` with no error handling. The timer + grid layout is in a flex column. `words` state is `[{word, score}]`.

- [ ] **Step 1: Add `retryCount` and `gridError` states**

In `Game.jsx`, after the existing state declarations, add:

```js
const [gridError, setGridError] = useState(null);
const [retryCount, setRetryCount] = useState(0);
```

- [ ] **Step 2: Replace the `fetchGrid` useEffect**

Replace:
```js
useEffect(() => { fetchGrid().then(setGrid); }, []);
```

With:
```js
useEffect(() => {
  setGrid(null);
  setGridError(null);
  fetchGrid()
    .then(setGrid)
    .catch(() => setGridError(true));
}, [retryCount]);
```

- [ ] **Step 3: Add the error screen before the loading guard**

Replace:
```js
if (!grid) return <p>Chargement…</p>;
```

With:
```js
if (gridError) return (
  <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
    <p className="text-danger text-center">Impossible de charger la grille. Vérifie ta connexion.</p>
    <button
      onClick={() => setRetryCount((c) => c + 1)}
      className="bg-surface px-6 py-2 rounded-lg"
    >
      Réessayer
    </button>
  </div>
);
if (!grid) return <p className="text-center text-text-muted">Chargement…</p>;
```

- [ ] **Step 4: Add live score display next to the Timer**

Add the import at top of file:
```js
import { BonusLegend } from "../components/BonusLegend.jsx";
```

In the JSX, replace:
```jsx
<Timer remainingMs={remainingMs} totalMs={DURATION} />
```

With:
```jsx
<div className="flex items-center justify-between">
  <Timer remainingMs={remainingMs} totalMs={DURATION} />
  <span className="font-display font-bold text-xl text-primary tabular-nums">
    {words.reduce((s, w) => s + w.score, 0)}{" "}
    <span className="text-sm text-text-muted font-normal">pts</span>
  </span>
</div>
```

- [ ] **Step 5: Add BonusLegend between buttons and feedback**

Replace:
```jsx
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
        <p role="status"
```

With:
```jsx
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
        <BonusLegend />
        <p role="status"
```

- [ ] **Step 6: Run all client tests**

```bash
cd client && npx vitest run
```

Expected: all tests PASS (no Game.jsx unit tests, but existing ones must not regress).

- [ ] **Step 7: Commit**

```bash
git add client/src/screens/Game.jsx
git commit -m "feat(game): live score display, BonusLegend, network error recovery"
```

---

## Task 5: End — animated score + rank phrase with total

**Files:**
- Modify: `client/src/screens/End.jsx`

**Context:** When `submitted` is `true`, `End.jsx` currently shows `<h2>Classement</h2>` + `<p>Ton rang : #N</p>` + leaderboard + buttons. The `total` prop is the game score (number of points). `rank` state holds the player's rank. We'll add `playerTotal` state for the DB count returned by the server.

- [ ] **Step 1: Add `playerTotal` state and read it from the submit response**

Add the import:
```js
import { motion } from "framer-motion";
```

Add state after `rank`:
```js
const [playerTotal, setPlayerTotal] = useState(null);
```

In `handleSubmit`, add `setPlayerTotal(r.total ?? null)`:
```js
async function handleSubmit(pseudo) {
  const r = await submitScore({ pseudo, score: total });
  setRank(r.rank);
  setPlayerTotal(r.total ?? null);
  setSubmitted(true);
}
```

- [ ] **Step 2: Replace the submitted view with animated version**

Replace the entire `if (!submitted)` / submitted return with:

```jsx
if (!submitted) {
  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto">
      <EndForm score={total} onSubmit={handleSubmit} />
      {gridId && onRobotReplay && (
        <button
          onClick={onRobotReplay}
          className="border border-surface-2 text-text-muted px-6 py-2 rounded-lg hover:border-primary/40 hover:text-text-base transition-colors duration-150 text-sm text-center"
        >
          Voir la solution du robot
        </button>
      )}
    </div>
  );
}

return (
  <section className="max-w-md mx-auto flex flex-col gap-4">
    <div className="flex flex-col items-center gap-1 py-2">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="flex items-baseline gap-1"
      >
        <span className="font-display text-5xl font-bold text-success">{total}</span>
        <span className="text-text-muted text-sm">pts</span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="text-text-muted text-sm"
      >
        Tu es{" "}
        <span className="text-accent font-bold">#{rank}</span>
        {playerTotal != null && (
          <> sur <span className="text-text-muted">{playerTotal}</span> joueurs</>
        )}
      </motion.p>
    </div>
    <Leaderboard rows={board} />
    <div className="flex gap-2 justify-center">
      <button onClick={onRestart} className="bg-primary text-bg px-6 py-2 rounded-lg font-bold">Rejouer</button>
      <button onClick={onMenu} className="bg-surface px-6 py-2 rounded-lg">Menu</button>
    </div>
    {gridId && onRobotReplay && (
      <button
        onClick={onRobotReplay}
        className="border border-surface-2 text-text-muted px-6 py-2 rounded-lg hover:border-primary/40 hover:text-text-base transition-colors duration-150 text-sm text-center"
      >
        Voir la solution du robot
      </button>
    )}
  </section>
);
```

- [ ] **Step 3: Run all client tests**

```bash
cd client && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/screens/End.jsx
git commit -m "feat(end): animated score reveal, rank phrase with total players, ghost button"
```

---

## Task 6: Ghost button — Menu

**Files:**
- Modify: `client/src/screens/Menu.jsx`

- [ ] **Step 1: Update the "Voir le classement" button in `Menu.jsx`**

Replace:
```jsx
      <motion.button
        variants={reduced ? undefined : item}
        onClick={onLeaderboard}
        className="text-text-muted underline"
      >
        Voir le classement
      </motion.button>
```

With:
```jsx
      <motion.button
        variants={reduced ? undefined : item}
        onClick={onLeaderboard}
        className="border border-surface-2 text-text-muted px-6 py-2 rounded-lg hover:border-primary/40 hover:text-text-base transition-colors duration-150"
      >
        Voir le classement
      </motion.button>
```

- [ ] **Step 2: Run all client tests**

```bash
cd client && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 3: Run all server tests**

```bash
cd server && npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src/screens/Menu.jsx
git commit -m "feat(menu): ghost button style for secondary navigation"
```

---

## Self-review

**Spec coverage:**
1. ✅ Trait SVG → Task 2
2. ✅ Score live → Task 4
3. ✅ BonusLegend dépliable → Task 3 + Task 4
4. ✅ End animé (score scale-in + rang différé + total joueurs) → Task 5
5. ✅ Boutons ghost → Task 5 (End) + Task 6 (Menu)
6. ✅ Erreur réseau fetchGrid → Task 4
7. ✅ Server countScores + total → Task 1

**Placeholder scan:** Aucun TBD. Tout le code est complet.

**Type consistency:**
- `countScores()` défini en Task 1, appelé dans Task 1 — cohérent
- `BonusLegend` créé en Task 3, importé en Task 4 — cohérent
- `playerTotal` state introduit et utilisé dans Task 5 — cohérent
- Style ghost button identique dans Task 5 et Task 6 — cohérent
