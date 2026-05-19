# Polish — Animations, Logo & Robot UX

**Date:** 2026-05-19  
**Scope:** 5 independent improvements to the Ruzzle client. No server changes.

---

## 1. Robot replay — slower timing

**File:** `client/src/hooks/useRobotReplay.js`

Update timing constants:

| Constant | Before | After |
|---|---|---|
| `STAGGER_MS` | 120 | 200 |
| `HOLD_MS` | 600 | 900 |
| `CLEAR_MS` | 300 | 400 |
| `GAP_MS` | 150 | 250 |

`REDUCED_HOLD_MS` stays at 800 (reduced-motion users already see a fast path).

---

## 2. Solution list — progressive reveal

**File:** `client/src/screens/RobotReplay.jsx`

Currently `SolutionList` receives the full `solutions` array at mount — all words are visible immediately.

**New behaviour:** `SolutionList` receives only the words revealed so far. In `RobotReplay`, compute:

```js
const revealedSolutions = done ? solutions : solutions.slice(0, wordIndex + 1);
```

So the word currently being replayed (`wordIndex`) appears in the list the moment the robot starts it — `wordIndex + 1` ensures the current word is included. `currentEntry` is always the last item in `revealedSolutions`.

`SolutionList` wraps its list in `<AnimatePresence>` and each `<motion.div>` entry uses:
```js
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
```

The `activeRef` scroll behaviour is kept — the last revealed item scrolls into view.

The active item (last in `revealedSolutions` when not done) is highlighted amber. Past items are muted. No "future" items exist until revealed.

---

## 3. Robot animation — glow pulse + luminous trail

### 3a. Luminous trail

**Files:** `useRobotReplay.js`, `Grid.jsx`, `Tile.jsx`

`useRobotReplay` exposes two new values:
- `stepIndex: number` — current step within the active word's path
- `isHolding: boolean` — true when `stepIndex === path.length` (hold phase)

`Grid` receives `robotPath` (array, ordered) + `stepIndex`. For each tile at position `i` in `robotPath`, compute trail opacity:

```js
const trailDepth = stepIndex - 1 - robotPath.indexOf(tileIndex);
// trailDepth 0 = current tile (full), 1 = one behind, 2 = two behind, 3+ = hidden
const trailOpacity = trailDepth === 0 ? 1 : trailDepth === 1 ? 0.65 : trailDepth === 2 ? 0.4 : 0;
```

`Tile` receives `robotTrailOpacity: number` (0–1) instead of a boolean `robotSelected`. When `> 0`: amber background, opacity set to `robotTrailOpacity`, ring only on current tile (`opacity === 1`).

### 3b. Glow pulse during hold

`Tile` receives `robotPulsing: boolean`. When true and `!reduced`, animate:
```js
animate={{ scale: [1.12, 1.2, 1.12], filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"] }}
transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
```

`Grid` passes `robotPulsing={isHolding && robotPath.includes(i)}` to each tile.

When `isHolding` becomes false (clear phase begins), `robotPulsing` drops to false and tiles return to trail behaviour (opacity starts clearing).

---

## 4. Game — word-found animation (flash + bounce + floating score)

### 4a. Flash + bounce on path tiles

**Files:** `Game.jsx`, `Grid.jsx`, `Tile.jsx`

`Game` adds state:
```js
const [flashPath, setFlashPath] = useState([]);
```

On successful validation:
```js
setFlashPath(path);
setTimeout(() => setFlashPath([]), 500);
```

`Grid` receives `flashPath: number[]`, passes `flashing={flashPath.includes(i)}` to each `Tile`.

`Tile` — when `flashing && !reduced`:
```js
animate={{ scale: [1, 1.3, 0.95, 1], backgroundColor: ["#8B5CF6", "#10B981", "#10B981", "#1A1530"] }}
transition={{ duration: 0.45, ease: "easeOut" }}
```
Background uses Framer Motion's `animate` with keyframes array (not CSS class) so it can transition through colors mid-animation.

### 4b. Floating score

New component `client/src/components/FloatingScore.jsx`:

```jsx
export function FloatingScore({ score, scoreKey }) {
  return (
    <AnimatePresence mode="wait">
      {score !== null && (
        <motion.span
          key={scoreKey}
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -48, scale: 1.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-x-0 top-1/2 text-center font-display font-bold text-3xl text-success pointer-events-none z-10"
        >
          +{score}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
```

`Game` wraps the `<Grid>` in a `relative` container and renders `<FloatingScore>` inside. `scoreKey` increments on each valid word to re-trigger the animation.

`Game` state additions:
```js
const [floatingScore, setFloatingScore] = useState(null);
const [scoreKey, setScoreKey] = useState(0);
```

On valid word:
```js
setFloatingScore(r.score);
setScoreKey(k => k + 1);
setTimeout(() => setFloatingScore(null), 650);
```

---

## 5. Logo SVG animé — Menu

New component `client/src/components/RuzzleLogo.jsx`.

**Structure:** SVG 3 columns × 2 rows of rounded rect tiles spelling R-U-Z / Z-L-E. Tile size 56×56px, gap 8px, corner radius 10px. Total SVG width: 3×56 + 2×8 = 184px, height: 2×56 + 1×8 = 120px.

**Colors:** tile bg `#1A1530` (surface), letter `#F4F1FF` (text), tile stroke `#8B5CF6` (primary) at 40% opacity.

**Entry animation (CSS `@keyframes`):**
```css
@keyframes tile-pop {
  0%   { transform: scale(0.6); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
```
Each `<g>` (tile group) uses `animation: tile-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards` with `animation-delay: N * 80ms` (N = 0..5).

**Loop glow (CSS `@keyframes`):**
```css
@keyframes logo-glow {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(139,92,246,0.3)); }
  50%       { filter: drop-shadow(0 0 12px rgba(139,92,246,0.8)); }
}
```
Applied to the root `<svg>` with `animation: logo-glow 3s ease-in-out infinite`, starting after 700ms (`animation-delay: 0.7s`).

**`usePrefersReducedMotion` integration:** if `reduced`, no animation, tiles render at full opacity/scale immediately.

**Menu.jsx:** replace `<motion.h1>Ruzzle FR</motion.h1>` with:
```jsx
<motion.div variants={reduced ? undefined : item}>
  <RuzzleLogo />
</motion.div>
<motion.p variants={item} className="text-text-muted text-sm tracking-widest uppercase">
  FR
</motion.p>
```

---

## File map

| Action | File |
|---|---|
| Modify | `client/src/hooks/useRobotReplay.js` — timing + expose `stepIndex`, `isHolding` |
| Modify | `client/src/hooks/useRobotReplay.test.js` — update timing-sensitive tests |
| Modify | `client/src/screens/RobotReplay.jsx` — progressive reveal |
| Modify | `client/src/components/Grid.jsx` — `flashPath`, `stepIndex`, `isHolding` props |
| Modify | `client/src/components/Tile.jsx` — `flashing`, `robotTrailOpacity`, `robotPulsing` props |
| Modify | `client/src/components/Grid.test.jsx` — cover new props |
| Modify | `client/src/components/Tile.test.jsx` — cover new props |
| Modify | `client/src/screens/Game.jsx` — `flashPath`, `FloatingScore` |
| Create | `client/src/components/FloatingScore.jsx` |
| Create | `client/src/components/RuzzleLogo.jsx` |
| Modify | `client/src/screens/Menu.jsx` — use `RuzzleLogo` |
| Modify | `client/src/styles/index.css` — add `tile-pop` + `logo-glow` keyframes |

---

## Testing strategy

- `useRobotReplay.test.js` — update timing expectations for new constants; add assertions for `stepIndex` and `isHolding` exposed values
- `Tile.test.jsx` — add tests for `flashing`, `robotTrailOpacity`, `robotPulsing` rendering
- `Grid.test.jsx` — add tests for `flashPath`, `stepIndex`/`isHolding` plumbing
- `RobotReplay.test.jsx` — verify words appear progressively (list length matches `wordIndex`)
- `FloatingScore.jsx` — unit test: renders `+N`, not rendered when `score === null`
- `RuzzleLogo.jsx` — smoke test: renders 6 letter elements

## Out of scope

- Server changes
- Leaderboard, timer, or scoring logic
- Sound effects
- Mobile gesture changes
