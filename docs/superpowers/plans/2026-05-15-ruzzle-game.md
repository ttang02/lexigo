# Ruzzle FR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working web Ruzzle (FR) game with React+Vite client, Node+Express+SQLite server, authoritative word validation, persistent leaderboard, and polished UI.

**Architecture:** pnpm monorepo with `client/` (React 18 + Vite + Tailwind + Framer Motion) and `server/` (Node + Express + better-sqlite3 + in-memory Trie). Server is authoritative for grid generation, word validation, and scoring. SQLite stores scores keyed by pseudo.

**Tech Stack:** Node 20+, pnpm, React 18, Vite, Tailwind CSS, Framer Motion, Express, better-sqlite3, Vitest, React Testing Library, ESLint.

**Reference spec:** `docs/superpowers/specs/2026-05-15-ruzzle-game-design.md`.

---

## Phase 0 — Workspace setup

### Task 1: Initialize pnpm monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "client"
  - "server"
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "ruzzle",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"pnpm --filter server dev\" \"pnpm --filter client dev\"",
    "build": "pnpm --filter client build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 3: Create `.env.example`**

```
DICT_PATH=server/data/dict.txt
PORT=3001
NODE_ENV=development
GRID_TTL_MS=600000
```

- [ ] **Step 4: Create minimal `README.md`**

```markdown
# Ruzzle FR

Web implementation of the Ruzzle word game (French) with persistent leaderboard.

## Quick start

\`\`\`bash
pnpm install
cp .env.example .env
# Place your dictionary at server/data/dict.txt (one word per line)
pnpm dev
\`\`\`

Client: http://localhost:5173 — Server: http://localhost:3001

See `docs/superpowers/specs/2026-05-15-ruzzle-game-design.md` for design details.
```

- [ ] **Step 5: Install root deps**

Run: `pnpm install`
Expected: lockfile created.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml .env.example README.md pnpm-lock.yaml
git commit -m "chore: scaffold pnpm monorepo"
```

---

### Task 2: Scaffold server package

**Files:**
- Create: `server/package.json`
- Create: `server/vitest.config.js`
- Create: `server/.eslintrc.cjs`
- Create: `server/src/index.js` (stub)
- Create: `server/data/.gitkeep`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nodemon --watch src --watch data/dict.txt src/index.js",
    "start": "node src/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src tests"
  },
  "dependencies": {
    "better-sqlite3": "^11.3.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "eslint": "^9.10.0",
    "nodemon": "^3.1.4",
    "supertest": "^7.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `server/vitest.config.js`**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
```

- [ ] **Step 3: Create `server/.eslintrc.cjs`**

```js
module.exports = {
  env: { node: true, es2022: true },
  extends: ["eslint:recommended"],
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  rules: { "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }] },
};
```

- [ ] **Step 4: Create stub `server/src/index.js`**

```js
console.log("server stub");
```

- [ ] **Step 5: Create `server/data/.gitkeep`** (empty file).

- [ ] **Step 6: Install**

Run: `pnpm install`
Expected: server deps installed.

- [ ] **Step 7: Commit**

```bash
git add server/ pnpm-lock.yaml
git commit -m "chore(server): scaffold express + vitest"
```

---

### Task 3: Scaffold client package

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/index.html`
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx` (stub)
- Create: `client/src/styles/index.css`
- Create: `client/src/styles/tokens.css`
- Create: `client/.eslintrc.cjs`

- [ ] **Step 1: Create `client/package.json`**

```json
{
  "name": "client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src"
  },
  "dependencies": {
    "framer-motion": "^11.5.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.10.0",
    "eslint-plugin-react": "^7.36.1",
    "eslint-plugin-react-hooks": "^4.6.2",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.12",
    "vite": "^5.4.6",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `client/vite.config.js`**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.js"],
  },
});
```

- [ ] **Step 3: Create `client/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0F0B1F",
        surface: "#1A1530",
        "surface-2": "#241D40",
        primary: "#8B5CF6",
        accent: "#FBBF24",
        success: "#10B981",
        danger: "#EF4444",
        "text-base": "#F4F1FF",
        "text-muted": "#9B96B5",
        "bonus-dl": "#3B82F6",
        "bonus-tl": "#8B5CF6",
        "bonus-dw": "#F97316",
        "bonus-tw": "#DC2626",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        tile: "16px",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Create `client/postcss.config.js`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 5: Create `client/index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
    <title>Ruzzle FR</title>
  </head>
  <body class="bg-bg text-text-base font-body">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `client/src/main.jsx`**

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: Create `client/src/App.jsx`**

```jsx
export default function App() {
  return (
    <main className="min-h-dvh flex items-center justify-center">
      <h1 className="font-display text-4xl text-accent">Ruzzle FR</h1>
    </main>
  );
}
```

- [ ] **Step 8: Create `client/src/styles/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { -webkit-font-smoothing: antialiased; }
  body { font-feature-settings: "tnum" 0; }
  .tabular { font-variant-numeric: tabular-nums; }
}
```

- [ ] **Step 9: Create `client/src/styles/tokens.css`** (placeholder for spec tokens, imported later as needed)

```css
:root {
  --color-bg: #0F0B1F;
  --color-surface: #1A1530;
  --color-primary: #8B5CF6;
  --color-accent: #FBBF24;
  --color-success: #10B981;
  --color-danger: #EF4444;
  --color-text: #F4F1FF;
  --color-text-muted: #9B96B5;
}
```

- [ ] **Step 10: Create `client/src/test-setup.js`**

```js
import "@testing-library/jest-dom";
```

- [ ] **Step 11: Create `client/.eslintrc.cjs`**

```js
module.exports = {
  env: { browser: true, es2022: true },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
  settings: { react: { version: "detect" } },
  rules: { "react/react-in-jsx-scope": "off", "react/prop-types": "off" },
};
```

- [ ] **Step 12: Install + smoke test**

Run: `pnpm install` then `pnpm --filter client dev`
Expected: Vite serves on 5173, page shows "Ruzzle FR" title in amber.
Stop dev server with Ctrl+C.

- [ ] **Step 13: Commit**

```bash
git add client/ pnpm-lock.yaml
git commit -m "chore(client): scaffold React+Vite+Tailwind"
```

---

## Phase 1 — Server core (TDD)

### Task 4: Accent normalizer + Trie

**Files:**
- Create: `server/src/dict.js`
- Test: `server/tests/dict.test.js`

- [ ] **Step 1: Write failing tests**

Create `server/tests/dict.test.js`:

```js
import { describe, it, expect } from "vitest";
import { normalize, Trie } from "../src/dict.js";

describe("normalize", () => {
  it("uppercases and strips accents", () => {
    expect(normalize("éléphant")).toBe("ELEPHANT");
    expect(normalize("Çà")).toBe("CA");
    expect(normalize("naïve")).toBe("NAIVE");
    expect(normalize("œuf")).toBe("OEUF");
  });
  it("trims whitespace", () => {
    expect(normalize("  bonjour  ")).toBe("BONJOUR");
  });
});

describe("Trie", () => {
  it("inserts and looks up words", () => {
    const t = new Trie();
    t.insert("CHAT");
    t.insert("CHIEN");
    expect(t.hasWord("CHAT")).toBe(true);
    expect(t.hasWord("CHIEN")).toBe(true);
    expect(t.hasWord("CHA")).toBe(false);
    expect(t.hasWord("CHATS")).toBe(false);
  });
  it("supports prefix lookup", () => {
    const t = new Trie();
    t.insert("CHAT");
    expect(t.hasPrefix("CH")).toBe(true);
    expect(t.hasPrefix("CHAT")).toBe(true);
    expect(t.hasPrefix("CHATS")).toBe(false);
    expect(t.hasPrefix("XY")).toBe(false);
  });
  it("ignores non A-Z characters in lookup gracefully", () => {
    const t = new Trie();
    t.insert("CHAT");
    expect(t.hasWord("CH4T")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `pnpm --filter server test`
Expected: FAIL (`Cannot find module '../src/dict.js'`).

- [ ] **Step 3: Implement `server/src/dict.js`**

```js
export function normalize(s) {
  return s.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/œ/gi, "oe").replace(/æ/gi, "ae")
    .toUpperCase();
}

const A_CODE = "A".charCodeAt(0);
const ALPHABET = 26;

export class Trie {
  constructor() {
    this.root = { children: new Array(ALPHABET), terminal: false };
  }
  insert(word) {
    let node = this.root;
    for (const ch of word) {
      const idx = ch.charCodeAt(0) - A_CODE;
      if (idx < 0 || idx >= ALPHABET) return;
      if (!node.children[idx]) node.children[idx] = { children: new Array(ALPHABET), terminal: false };
      node = node.children[idx];
    }
    node.terminal = true;
  }
  _find(word) {
    let node = this.root;
    for (const ch of word) {
      const idx = ch.charCodeAt(0) - A_CODE;
      if (idx < 0 || idx >= ALPHABET) return null;
      node = node.children[idx];
      if (!node) return null;
    }
    return node;
  }
  hasWord(word) {
    const n = this._find(word);
    return !!n && n.terminal;
  }
  hasPrefix(prefix) {
    return !!this._find(prefix);
  }
}

export async function loadDictionary(filePath, fs) {
  const raw = await fs.promises.readFile(filePath, "utf8");
  const trie = new Trie();
  let count = 0;
  for (const line of raw.split(/\r?\n/)) {
    const w = normalize(line);
    if (w.length >= 2 && w.length <= 16 && /^[A-Z]+$/.test(w)) {
      trie.insert(w);
      count++;
    }
  }
  return { trie, count };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm --filter server test`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/dict.js server/tests/dict.test.js
git commit -m "feat(server): add Trie and accent normalizer"
```

---

### Task 5: Score function

**Files:**
- Create: `server/src/score.js`
- Test: `server/tests/score.test.js`

- [ ] **Step 1: Write failing tests**

Create `server/tests/score.test.js`:

```js
import { describe, it, expect } from "vitest";
import { letterValue, computeScore } from "../src/score.js";

describe("letterValue", () => {
  it("returns 1 for common letters", () => {
    for (const c of "AEILNORSTU") expect(letterValue(c)).toBe(1);
  });
  it("returns correct rarer values", () => {
    expect(letterValue("D")).toBe(2);
    expect(letterValue("B")).toBe(3);
    expect(letterValue("F")).toBe(4);
    expect(letterValue("J")).toBe(8);
    expect(letterValue("K")).toBe(10);
  });
});

function mkCells(spec) {
  // spec: array of "L" or "L:DL" etc., length 16
  return spec.map((s) => {
    const [letter, bonus] = s.split(":");
    return { letter, bonus: bonus || null };
  });
}

describe("computeScore", () => {
  it("sums simple letters with no bonuses", () => {
    const cells = mkCells(["C","H","A","T", "X","X","X","X", "X","X","X","X", "X","X","X","X"]);
    expect(computeScore({ path: [0,1,2,3], cells })).toBe(3 + 4 + 1 + 1);
  });
  it("applies DL to a single letter", () => {
    const cells = mkCells(["C:DL","H","A","T", "X","X","X","X", "X","X","X","X", "X","X","X","X"]);
    expect(computeScore({ path: [0,1,2,3], cells })).toBe(3*2 + 4 + 1 + 1);
  });
  it("applies TL to a single letter", () => {
    const cells = mkCells(["C","H:TL","A","T", "X","X","X","X", "X","X","X","X", "X","X","X","X"]);
    expect(computeScore({ path: [0,1,2,3], cells })).toBe(3 + 4*3 + 1 + 1);
  });
  it("applies DW after letter sum", () => {
    const cells = mkCells(["C","H","A","T:DW", "X","X","X","X", "X","X","X","X", "X","X","X","X"]);
    expect(computeScore({ path: [0,1,2,3], cells })).toBe((3+4+1+1) * 2);
  });
  it("applies TW after letter sum", () => {
    const cells = mkCells(["C","H","A","T:TW", "X","X","X","X", "X","X","X","X", "X","X","X","X"]);
    expect(computeScore({ path: [0,1,2,3], cells })).toBe((3+4+1+1) * 3);
  });
  it("combines DW and TW multiplicatively (x6)", () => {
    const cells = mkCells(["C:DW","H","A","T:TW", "X","X","X","X", "X","X","X","X", "X","X","X","X"]);
    expect(computeScore({ path: [0,1,2,3], cells })).toBe((3+4+1+1) * 6);
  });
  it("adds +5 length bonus at exactly 5 letters", () => {
    const cells = mkCells(["A","B","C","D","E", "X","X","X","X","X","X","X","X","X","X","X"]);
    // A=1 B=3 C=3 D=2 E=1 = 10; +5 length bonus = 15
    expect(computeScore({ path: [0,1,2,3,4], cells })).toBe(10 + 5);
  });
  it("adds +10 at 6 letters", () => {
    const cells = mkCells(["A","B","C","D","E","F", "X","X","X","X","X","X","X","X","X","X"]);
    expect(computeScore({ path: [0,1,2,3,4,5], cells })).toBe(1+3+3+2+1+4 + 10);
  });
  it("adds +15 at 7 letters", () => {
    const cells = mkCells(["A","B","C","D","E","F","G", "X","X","X","X","X","X","X","X","X"]);
    expect(computeScore({ path: [0,1,2,3,4,5,6], cells })).toBe(1+3+3+2+1+4+2 + 15);
  });
  it("adds +20 at 8+ letters", () => {
    const cells = mkCells(["A","B","C","D","E","F","G","H", "X","X","X","X","X","X","X","X"]);
    expect(computeScore({ path: [0,1,2,3,4,5,6,7], cells })).toBe(1+3+3+2+1+4+2+4 + 20);
  });
  it("calculation order: (letters with DL) * word bonus + length bonus", () => {
    // 5-letter word with DL on first and DW on last
    const cells = mkCells(["A:DL","B","C","D","E:DW", "X","X","X","X","X","X","X","X","X","X","X"]);
    // letters: (1*2)+3+3+2+1 = 11; *2 = 22; +5 = 27
    expect(computeScore({ path: [0,1,2,3,4], cells })).toBe(27);
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `pnpm --filter server test score`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `server/src/score.js`**

```js
const LETTER_VALUES = {
  A:1,E:1,I:1,L:1,N:1,O:1,R:1,S:1,T:1,U:1,
  D:2,G:2,M:2,
  B:3,C:3,P:3,
  F:4,H:4,V:4,
  J:8,Q:8,
  K:10,W:10,X:10,Y:10,Z:10,
};

export function letterValue(ch) {
  return LETTER_VALUES[ch] ?? 0;
}

function lengthBonus(n) {
  if (n >= 8) return 20;
  if (n === 7) return 15;
  if (n === 6) return 10;
  if (n === 5) return 5;
  return 0;
}

export function computeScore({ path, cells }) {
  let letterSum = 0;
  let wordMultiplier = 1;
  for (const idx of path) {
    const cell = cells[idx];
    let v = letterValue(cell.letter);
    if (cell.bonus === "DL") v *= 2;
    else if (cell.bonus === "TL") v *= 3;
    letterSum += v;
    if (cell.bonus === "DW") wordMultiplier *= 2;
    else if (cell.bonus === "TW") wordMultiplier *= 3;
  }
  return letterSum * wordMultiplier + lengthBonus(path.length);
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm --filter server test score`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/score.js server/tests/score.test.js
git commit -m "feat(server): word scoring per spec"
```

---

### Task 6: Grid generator

**Files:**
- Create: `server/src/grid.js`
- Test: `server/tests/grid.test.js`

- [ ] **Step 1: Write failing tests**

Create `server/tests/grid.test.js`:

```js
import { describe, it, expect } from "vitest";
import { generateGrid, FRENCH_TILE_POOL, BONUSES } from "../src/grid.js";

describe("generateGrid", () => {
  it("returns a gridId and 16 cells", () => {
    const g = generateGrid();
    expect(g.gridId).toMatch(/^[a-f0-9-]{16,}$/i);
    expect(g.cells).toHaveLength(16);
  });
  it("cells contain only single uppercase A-Z letters", () => {
    const g = generateGrid();
    for (const cell of g.cells) {
      expect(cell.letter).toMatch(/^[A-Z]$/);
      if (cell.bonus !== null) expect(BONUSES).toContain(cell.bonus);
    }
  });
  it("places between 3 and 4 bonus cells", () => {
    const g = generateGrid();
    const bonusCount = g.cells.filter((c) => c.bonus !== null).length;
    expect(bonusCount).toBeGreaterThanOrEqual(3);
    expect(bonusCount).toBeLessThanOrEqual(4);
  });
  it("pool only contains valid scrabble FR letters", () => {
    for (const l of FRENCH_TILE_POOL) expect(l).toMatch(/^[A-Z]$/);
  });
  it("uses a seeded RNG when seed provided (deterministic)", () => {
    const a = generateGrid({ seed: 42 });
    const b = generateGrid({ seed: 42 });
    expect(a.cells.map((c) => c.letter + (c.bonus || "")).join("")).toBe(
      b.cells.map((c) => c.letter + (c.bonus || "")).join("")
    );
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `pnpm --filter server test grid`
Expected: FAIL.

- [ ] **Step 3: Implement `server/src/grid.js`**

```js
import { randomUUID } from "node:crypto";

// Scrabble FR letter distribution (102 tiles minus 2 blanks = 100; we omit blanks)
const FRENCH_DIST = {
  A:9,B:2,C:2,D:3,E:15,F:2,G:2,H:2,I:8,J:1,K:1,L:5,M:3,
  N:6,O:6,P:2,Q:1,R:6,S:6,T:6,U:6,V:2,W:1,X:1,Y:1,Z:1,
};

export const FRENCH_TILE_POOL = Object.entries(FRENCH_DIST)
  .flatMap(([letter, count]) => Array(count).fill(letter));

export const BONUSES = ["DL", "TL", "DW", "TW"];
const BONUS_WEIGHTS = { DL: 0.60, TL: 0.20, DW: 0.15, TW: 0.05 };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickBonus(rng) {
  const r = rng();
  let acc = 0;
  for (const b of BONUSES) {
    acc += BONUS_WEIGHTS[b];
    if (r <= acc) return b;
  }
  return "DL";
}

export function generateGrid({ seed } = {}) {
  const rng = seed != null ? mulberry32(seed) : Math.random;
  const pool = [...FRENCH_TILE_POOL];
  // Fisher-Yates partial: pick 16 without replacement
  for (let i = pool.length - 1; i > pool.length - 17; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const letters = pool.slice(-16);

  const cells = letters.map((letter) => ({ letter, bonus: null }));

  // 3 or 4 bonus cells
  const bonusCount = 3 + Math.floor(rng() * 2);
  const indices = [...Array(16).keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (let k = 0; k < bonusCount; k++) {
    cells[indices[k]].bonus = pickBonus(rng);
  }

  return { gridId: randomUUID(), cells, seed: seed ?? null };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm --filter server test grid`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/grid.js server/tests/grid.test.js
git commit -m "feat(server): 4x4 grid generator with FR letter distribution"
```

---

### Task 7: Grid cache with TTL

**Files:**
- Create: `server/src/gridCache.js`
- Test: `server/tests/gridCache.test.js`

- [ ] **Step 1: Write failing tests**

Create `server/tests/gridCache.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GridCache } from "../src/gridCache.js";

describe("GridCache", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-01T00:00:00Z")); });
  afterEach(() => { vi.useRealTimers(); });

  it("stores and retrieves a grid", () => {
    const c = new GridCache({ ttlMs: 10_000 });
    c.set("g1", [{ letter: "A", bonus: null }]);
    expect(c.get("g1")).toEqual([{ letter: "A", bonus: null }]);
  });
  it("returns null past TTL", () => {
    const c = new GridCache({ ttlMs: 10_000 });
    c.set("g1", [{ letter: "A", bonus: null }]);
    vi.advanceTimersByTime(11_000);
    expect(c.get("g1")).toBeNull();
  });
  it("returns null for unknown gridId", () => {
    const c = new GridCache({ ttlMs: 10_000 });
    expect(c.get("nope")).toBeNull();
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter server test gridCache`
Expected: FAIL.

- [ ] **Step 3: Implement `server/src/gridCache.js`**

```js
export class GridCache {
  constructor({ ttlMs = 600_000 } = {}) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }
  set(gridId, cells) {
    this.store.set(gridId, { cells, createdAt: Date.now() });
  }
  get(gridId) {
    const entry = this.store.get(gridId);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.store.delete(gridId);
      return null;
    }
    return entry.cells;
  }
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter server test gridCache`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/gridCache.js server/tests/gridCache.test.js
git commit -m "feat(server): in-memory grid cache with TTL"
```

---

### Task 8: SQLite scores DAO

**Files:**
- Create: `server/src/db.js`
- Test: `server/tests/db.test.js`

- [ ] **Step 1: Write failing tests**

Create `server/tests/db.test.js`:

```js
import { describe, it, expect, beforeEach } from "vitest";
import { createDb } from "../src/db.js";

describe("scores DAO", () => {
  let db;
  beforeEach(() => { db = createDb(":memory:"); });

  it("inserts a new score", () => {
    const res = db.upsertScore({ pseudo: "alice", score: 100 });
    expect(res.changed).toBe(true);
    expect(db.topScores(10)).toEqual([
      { pseudo: "alice", score: 100, updated_at: expect.any(Number) },
    ]);
  });
  it("updates only if higher score", () => {
    db.upsertScore({ pseudo: "alice", score: 100 });
    const lower = db.upsertScore({ pseudo: "alice", score: 50 });
    expect(lower.changed).toBe(false);
    const higher = db.upsertScore({ pseudo: "alice", score: 200 });
    expect(higher.changed).toBe(true);
    expect(db.topScores(10)[0].score).toBe(200);
  });
  it("orders top scores descending and respects limit", () => {
    db.upsertScore({ pseudo: "a", score: 10 });
    db.upsertScore({ pseudo: "b", score: 50 });
    db.upsertScore({ pseudo: "c", score: 30 });
    const top = db.topScores(2);
    expect(top.map((r) => r.pseudo)).toEqual(["b", "c"]);
  });
  it("computes rank for a pseudo", () => {
    db.upsertScore({ pseudo: "a", score: 10 });
    db.upsertScore({ pseudo: "b", score: 50 });
    db.upsertScore({ pseudo: "c", score: 30 });
    expect(db.rankOf("b")).toBe(1);
    expect(db.rankOf("a")).toBe(3);
    expect(db.rankOf("none")).toBe(null);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter server test db`
Expected: FAIL.

- [ ] **Step 3: Implement `server/src/db.js`**

```js
import Database from "better-sqlite3";

export function createDb(path) {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      pseudo TEXT PRIMARY KEY,
      score INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores (score DESC);
  `);

  const upsertStmt = db.prepare(`
    INSERT INTO scores (pseudo, score, updated_at)
    VALUES (@pseudo, @score, @updated_at)
    ON CONFLICT(pseudo) DO UPDATE SET
      score = excluded.score,
      updated_at = excluded.updated_at
    WHERE excluded.score > scores.score
  `);
  const topStmt = db.prepare(`SELECT pseudo, score, updated_at FROM scores ORDER BY score DESC, updated_at ASC LIMIT ?`);
  const rankStmt = db.prepare(`
    SELECT COUNT(*) + 1 AS rank FROM scores
    WHERE score > (SELECT score FROM scores WHERE pseudo = ?)
  `);
  const existsStmt = db.prepare(`SELECT 1 FROM scores WHERE pseudo = ?`);

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
  };
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter server test db`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/db.js server/tests/db.test.js
git commit -m "feat(server): SQLite scores DAO with upsert-if-higher"
```

---

### Task 9: Validation logic (path adjacency + word check)

**Files:**
- Create: `server/src/validate.js`
- Test: `server/tests/validate.test.js`

- [ ] **Step 1: Write failing tests**

Create `server/tests/validate.test.js`:

```js
import { describe, it, expect } from "vitest";
import { isPathValid, wordFromPath } from "../src/validate.js";

function cells(letters) {
  return letters.split("").map((l) => ({ letter: l, bonus: null }));
}

describe("isPathValid", () => {
  const c = cells("ABCDEFGHIJKLMNOP"); // 4x4 grid indexed 0..15
  // Layout:
  // 0  1  2  3
  // 4  5  6  7
  // 8  9 10 11
  //12 13 14 15

  it("accepts horizontal adjacency", () => {
    expect(isPathValid([0,1,2], c)).toBe(true);
  });
  it("accepts vertical adjacency", () => {
    expect(isPathValid([0,4,8,12], c)).toBe(true);
  });
  it("accepts diagonal adjacency", () => {
    expect(isPathValid([0,5,10,15], c)).toBe(true);
  });
  it("rejects non-adjacent step", () => {
    expect(isPathValid([0,2], c)).toBe(false);
    expect(isPathValid([0,15], c)).toBe(false);
  });
  it("rejects reused cell", () => {
    expect(isPathValid([0,1,0], c)).toBe(false);
  });
  it("rejects out-of-range index", () => {
    expect(isPathValid([0,16], c)).toBe(false);
    expect(isPathValid([-1,0], c)).toBe(false);
  });
  it("rejects length < 2", () => {
    expect(isPathValid([0], c)).toBe(false);
    expect(isPathValid([], c)).toBe(false);
  });
});

describe("wordFromPath", () => {
  it("concatenates letters along the path", () => {
    const c = cells("CHATXXXXXXXXXXXX");
    expect(wordFromPath([0,1,2,3], c)).toBe("CHAT");
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter server test validate`
Expected: FAIL.

- [ ] **Step 3: Implement `server/src/validate.js`**

```js
const ROWS = 4;
const COLS = 4;

function rc(i) { return { r: Math.floor(i / COLS), c: i % COLS }; }

export function isPathValid(path, cells) {
  if (!Array.isArray(path) || path.length < 2 || path.length > 16) return false;
  const seen = new Set();
  for (let k = 0; k < path.length; k++) {
    const idx = path[k];
    if (!Number.isInteger(idx) || idx < 0 || idx >= cells.length) return false;
    if (seen.has(idx)) return false;
    seen.add(idx);
    if (k > 0) {
      const a = rc(path[k-1]);
      const b = rc(idx);
      if (Math.abs(a.r - b.r) > 1 || Math.abs(a.c - b.c) > 1) return false;
      if (a.r === b.r && a.c === b.c) return false;
    }
  }
  return true;
}

export function wordFromPath(path, cells) {
  return path.map((i) => cells[i].letter).join("");
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter server test validate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/validate.js server/tests/validate.test.js
git commit -m "feat(server): path adjacency and word extraction"
```

---

### Task 10: Express bootstrap + routes

**Files:**
- Create: `server/src/index.js` (replace stub)
- Create: `server/src/routes/grid.js`
- Create: `server/src/routes/validate.js`
- Create: `server/src/routes/scores.js`
- Test: `server/tests/routes.test.js`

- [ ] **Step 1: Write failing tests**

Create `server/tests/routes.test.js`:

```js
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { Trie, normalize } from "../src/dict.js";
import { createDb } from "../src/db.js";
import { GridCache } from "../src/gridCache.js";

function makeApp() {
  const trie = new Trie();
  ["CHAT", "CHIEN", "ABAT"].forEach((w) => trie.insert(w));
  const db = createDb(":memory:");
  const cache = new GridCache({ ttlMs: 60_000 });
  return { app: buildApp({ trie, db, cache, normalize }), db, cache };
}

describe("GET /api/grid", () => {
  it("returns 16 cells and stores in cache", async () => {
    const { app, cache } = makeApp();
    const res = await request(app).get("/api/grid");
    expect(res.status).toBe(200);
    expect(res.body.cells).toHaveLength(16);
    expect(typeof res.body.gridId).toBe("string");
    expect(cache.get(res.body.gridId)).not.toBeNull();
  });
});

describe("POST /api/validate", () => {
  let ctx;
  beforeEach(async () => {
    ctx = makeApp();
    ctx.gridId = "fixed-id";
    ctx.cache.set("fixed-id", [
      { letter: "C", bonus: null }, { letter: "H", bonus: null }, { letter: "A", bonus: null }, { letter: "T", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null }, { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null }, { letter: "X", bonus: null }, { letter: "X", bonus: null },
      { letter: "X", bonus: null }, { letter: "X", bonus: null }, { letter: "X", bonus: null }, { letter: "X", bonus: null },
    ]);
  });
  it("validates a known word", async () => {
    const res = await request(ctx.app).post("/api/validate").send({ gridId: "fixed-id", path: [0,1,2,3], word: "CHAT" });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.score).toBeGreaterThan(0);
  });
  it("rejects unknown word", async () => {
    const res = await request(ctx.app).post("/api/validate").send({ gridId: "fixed-id", path: [0,1], word: "CH" });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.reason).toMatch(/dict/i);
  });
  it("rejects non-adjacent path", async () => {
    const res = await request(ctx.app).post("/api/validate").send({ gridId: "fixed-id", path: [0,3], word: "CT" });
    expect(res.status).toBe(400);
  });
  it("rejects when word/path mismatch", async () => {
    const res = await request(ctx.app).post("/api/validate").send({ gridId: "fixed-id", path: [0,1,2,3], word: "DOGS" });
    expect(res.status).toBe(400);
  });
  it("rejects expired/unknown grid", async () => {
    const res = await request(ctx.app).post("/api/validate").send({ gridId: "missing", path: [0,1], word: "AB" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/scores + GET /api/scores", () => {
  it("upserts and lists", async () => {
    const { app } = makeApp();
    const r1 = await request(app).post("/api/scores").send({ pseudo: "alice", score: 100 });
    expect(r1.status).toBe(200);
    expect(r1.body.ok).toBe(true);
    expect(r1.body.rank).toBe(1);
    await request(app).post("/api/scores").send({ pseudo: "bob", score: 50 });
    const r2 = await request(app).get("/api/scores?limit=10");
    expect(r2.status).toBe(200);
    expect(r2.body.map((r) => r.pseudo)).toEqual(["alice", "bob"]);
  });
  it("rejects bad pseudo", async () => {
    const { app } = makeApp();
    const r = await request(app).post("/api/scores").send({ pseudo: "", score: 10 });
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter server test routes`
Expected: FAIL.

- [ ] **Step 3: Create `server/src/app.js`**

```js
import express from "express";
import cors from "cors";
import { generateGrid } from "./grid.js";
import { isPathValid, wordFromPath } from "./validate.js";
import { computeScore } from "./score.js";

const PSEUDO_RE = /^[A-Za-z0-9_\- ]{1,20}$/;

export function buildApp({ trie, db, cache, normalize }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "16kb" }));

  app.get("/api/grid", (_req, res) => {
    const grid = generateGrid();
    cache.set(grid.gridId, grid.cells);
    res.json(grid);
  });

  app.post("/api/validate", (req, res) => {
    const { gridId, path, word } = req.body || {};
    const cells = cache.get(gridId);
    if (!cells) return res.status(400).json({ error: "grid expired or unknown", code: "GRID_MISSING" });
    if (!isPathValid(path, cells)) return res.status(400).json({ error: "invalid path", code: "PATH_INVALID" });
    const derived = wordFromPath(path, cells);
    const normalizedWord = typeof word === "string" ? normalize(word) : "";
    if (derived !== normalizedWord) return res.status(400).json({ error: "word does not match path", code: "WORD_MISMATCH" });
    if (!trie.hasWord(derived)) return res.json({ valid: false, score: 0, reason: "not in dictionary" });
    const score = computeScore({ path, cells });
    res.json({ valid: true, score });
  });

  app.post("/api/scores", (req, res) => {
    const { pseudo, score } = req.body || {};
    const cleanPseudo = typeof pseudo === "string" ? pseudo.trim() : "";
    if (!PSEUDO_RE.test(cleanPseudo)) return res.status(400).json({ error: "invalid pseudo", code: "PSEUDO_INVALID" });
    if (!Number.isInteger(score) || score < 0 || score > 100_000) return res.status(400).json({ error: "invalid score", code: "SCORE_INVALID" });
    db.upsertScore({ pseudo: cleanPseudo, score });
    res.json({ ok: true, rank: db.rankOf(cleanPseudo) });
  });

  app.get("/api/scores", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    res.json(db.topScores(limit));
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "internal error", code: "INTERNAL" });
  });

  return app;
}
```

- [ ] **Step 4: Replace `server/src/index.js`**

```js
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { loadDictionary, normalize } from "./dict.js";
import { createDb } from "./db.js";
import { GridCache } from "./gridCache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3001;
const dictPath = path.resolve(process.env.DICT_PATH || path.join(__dirname, "..", "data", "dict.txt"));
const dbPath = path.join(__dirname, "..", "data", "scores.sqlite");
const ttlMs = Number(process.env.GRID_TTL_MS) || 600_000;

if (!fs.existsSync(dictPath)) {
  console.error(`Dictionary not found at ${dictPath}. Set DICT_PATH or place the file there.`);
  process.exit(1);
}

const { trie, count } = await loadDictionary(dictPath, fs);
console.log(`Loaded ${count} words from ${dictPath}`);

const db = createDb(dbPath);
const cache = new GridCache({ ttlMs });
const app = buildApp({ trie, db, cache, normalize });

app.listen(port, () => console.log(`Ruzzle server listening on :${port}`));
```

- [ ] **Step 5: Verify tests pass**

Run: `pnpm --filter server test`
Expected: ALL pass.

- [ ] **Step 6: Smoke test the live server**

- Create a tiny dictionary at `server/data/dict.txt` with a few words on separate lines (e.g. `CHAT`, `CHIEN`, `ABAT`).
- Run: `pnpm --filter server dev`
- In another terminal: `curl http://localhost:3001/api/grid` → returns JSON with 16 cells.
- Stop server.
- Delete the temporary dict (it stays gitignored).

- [ ] **Step 7: Commit**

```bash
git add server/src/app.js server/src/index.js server/tests/routes.test.js
git commit -m "feat(server): express app with grid/validate/scores routes"
```

---

## Phase 2 — Client core

### Task 11: API client + design tokens wiring

**Files:**
- Create: `client/src/api.js`
- Test: `client/src/api.test.js`

- [ ] **Step 1: Write failing tests**

Create `client/src/api.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as api from "./api.js";

beforeEach(() => { globalThis.fetch = vi.fn(); });

describe("api", () => {
  it("fetchGrid GETs /api/grid", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ gridId: "x", cells: [], seed: null }) });
    const r = await api.fetchGrid();
    expect(fetch).toHaveBeenCalledWith("/api/grid");
    expect(r.gridId).toBe("x");
  });
  it("validateWord POSTs payload", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ valid: true, score: 10 }) });
    const r = await api.validateWord({ gridId: "g", path: [0,1], word: "AB" });
    expect(fetch).toHaveBeenCalledWith("/api/validate", expect.objectContaining({ method: "POST" }));
    expect(r.valid).toBe(true);
  });
  it("submitScore POSTs and returns ok+rank", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, rank: 3 }) });
    const r = await api.submitScore({ pseudo: "a", score: 10 });
    expect(r.rank).toBe(3);
  });
  it("fetchLeaderboard GETs with limit", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ([]) });
    await api.fetchLeaderboard(20);
    expect(fetch).toHaveBeenCalledWith("/api/scores?limit=20");
  });
  it("throws on non-2xx", async () => {
    fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "bad" }) });
    await expect(api.fetchGrid()).rejects.toThrow(/bad/);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter client test api`
Expected: FAIL.

- [ ] **Step 3: Implement `client/src/api.js`**

```js
async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

export async function fetchGrid() {
  const r = await fetch("/api/grid");
  return json(r);
}

export async function validateWord({ gridId, path, word }) {
  const r = await fetch("/api/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gridId, path, word }),
  });
  return json(r);
}

export async function submitScore({ pseudo, score }) {
  const r = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pseudo, score }),
  });
  return json(r);
}

export async function fetchLeaderboard(limit = 20) {
  const r = await fetch(`/api/scores?limit=${limit}`);
  return json(r);
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter client test api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/api.js client/src/api.test.js
git commit -m "feat(client): API wrapper"
```

---

### Task 12: usePathSelection hook

**Files:**
- Create: `client/src/hooks/usePathSelection.js`
- Test: `client/src/hooks/usePathSelection.test.js`

- [ ] **Step 1: Write failing tests**

Create `client/src/hooks/usePathSelection.test.js`:

```js
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePathSelection } from "./usePathSelection.js";

describe("usePathSelection", () => {
  it("adds first tile and tracks path", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    expect(result.current.path).toEqual([0]);
  });
  it("adds adjacent tile (right)", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.tap(1));
    expect(result.current.path).toEqual([0, 1]);
  });
  it("adds diagonal adjacent tile", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.tap(5));
    expect(result.current.path).toEqual([0, 5]);
  });
  it("rejects non-adjacent tap", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.tap(2));
    expect(result.current.path).toEqual([0]);
  });
  it("rejects reuse", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.tap(1));
    act(() => result.current.tap(0));
    expect(result.current.path).toEqual([0, 1]);
  });
  it("tapping last tile is a no-op", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.tap(0));
    expect(result.current.path).toEqual([0]);
  });
  it("tapping second-to-last backtracks", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.tap(1));
    act(() => result.current.tap(2));
    act(() => result.current.tap(1));
    expect(result.current.path).toEqual([0, 1]);
  });
  it("reset clears the path", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.reset());
    expect(result.current.path).toEqual([]);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter client test usePathSelection`
Expected: FAIL.

- [ ] **Step 3: Implement `client/src/hooks/usePathSelection.js`**

```js
import { useCallback, useState } from "react";

const COLS = 4;

function isAdjacent(a, b) {
  const ar = Math.floor(a / COLS), ac = a % COLS;
  const br = Math.floor(b / COLS), bc = b % COLS;
  if (a === b) return false;
  return Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1;
}

export function usePathSelection() {
  const [path, setPath] = useState([]);

  const tap = useCallback((idx) => {
    setPath((p) => {
      if (p.length === 0) return [idx];
      const last = p[p.length - 1];
      if (idx === last) return p;
      if (p.length >= 2 && idx === p[p.length - 2]) return p.slice(0, -1);
      if (p.includes(idx)) return p;
      if (!isAdjacent(last, idx)) return p;
      return [...p, idx];
    });
  }, []);

  const reset = useCallback(() => setPath([]), []);

  return { path, tap, reset };
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter client test usePathSelection`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/usePathSelection.js client/src/hooks/usePathSelection.test.js
git commit -m "feat(client): path selection hook with adjacency + backtrack"
```

---

### Task 13: useTimer hook

**Files:**
- Create: `client/src/hooks/useTimer.js`
- Test: `client/src/hooks/useTimer.test.js`

- [ ] **Step 1: Write failing tests**

Create `client/src/hooks/useTimer.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimer } from "./useTimer.js";

describe("useTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts at given duration and is not running", () => {
    const { result } = renderHook(() => useTimer({ durationMs: 120_000 }));
    expect(result.current.remainingMs).toBe(120_000);
    expect(result.current.running).toBe(false);
  });
  it("ticks down once started", () => {
    const { result } = renderHook(() => useTimer({ durationMs: 5_000 }));
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(result.current.remainingMs).toBeLessThanOrEqual(4_000);
  });
  it("fires onEnd once when remaining reaches 0", () => {
    const onEnd = vi.fn();
    const { result } = renderHook(() => useTimer({ durationMs: 1_000, onEnd }));
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(1_500); });
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.running).toBe(false);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter client test useTimer`
Expected: FAIL.

- [ ] **Step 3: Implement `client/src/hooks/useTimer.js`**

```js
import { useCallback, useEffect, useRef, useState } from "react";

export function useTimer({ durationMs, onEnd, tickMs = 100 }) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [running, setRunning] = useState(false);
  const startAtRef = useRef(null);
  const endedRef = useRef(false);

  const start = useCallback(() => {
    startAtRef.current = Date.now();
    endedRef.current = false;
    setRemainingMs(durationMs);
    setRunning(true);
  }, [durationMs]);

  const stop = useCallback(() => { setRunning(false); }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - startAtRef.current;
      const left = Math.max(0, durationMs - elapsed);
      setRemainingMs(left);
      if (left === 0 && !endedRef.current) {
        endedRef.current = true;
        setRunning(false);
        onEnd && onEnd();
      }
    }, tickMs);
    return () => clearInterval(id);
  }, [running, durationMs, onEnd, tickMs]);

  return { remainingMs, running, start, stop };
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter client test useTimer`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useTimer.js client/src/hooks/useTimer.test.js
git commit -m "feat(client): useTimer hook"
```

---

### Task 14: Tile component

**Files:**
- Create: `client/src/components/Tile.jsx`
- Test: `client/src/components/Tile.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/components/Tile.test.jsx`:

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
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter client test Tile`
Expected: FAIL.

- [ ] **Step 3: Implement `client/src/components/Tile.jsx`**

```jsx
import { motion } from "framer-motion";

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

export function Tile({ letter, bonus, index, selected, onTap }) {
  const ariaLabel = `Letter ${letter}${bonus ? `, ${BONUS_LABEL[bonus]} bonus` : ""}`;
  return (
    <motion.button
      type="button"
      onClick={() => onTap(index)}
      aria-label={ariaLabel}
      aria-pressed={selected}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={[
        "relative aspect-square rounded-tile font-display font-bold text-3xl md:text-4xl",
        "flex items-center justify-center select-none",
        "transition-colors duration-150",
        selected
          ? "bg-primary text-bg ring-2 ring-accent shadow-[0_0_16px_rgba(139,92,246,0.6)]"
          : "bg-surface-2 text-text-base hover:bg-surface",
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

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter client test Tile`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Tile.jsx client/src/components/Tile.test.jsx
git commit -m "feat(client): Tile component with bonus badge + a11y label"
```

---

### Task 15: Grid component

**Files:**
- Create: `client/src/components/Grid.jsx`
- Test: `client/src/components/Grid.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/components/Grid.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Grid } from "./Grid.jsx";

const cells = Array.from({ length: 16 }, (_, i) => ({ letter: String.fromCharCode(65 + i), bonus: null }));

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
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter client test Grid.test`
Expected: FAIL.

- [ ] **Step 3: Implement `client/src/components/Grid.jsx`**

```jsx
import { Tile } from "./Tile.jsx";

export function Grid({ cells, path, onTap }) {
  const selected = new Set(path);
  return (
    <div
      className="grid grid-cols-4 gap-2 w-full max-w-[480px] aspect-square mx-auto p-2 rounded-2xl bg-surface/40"
      role="group"
      aria-label="Ruzzle grid"
    >
      {cells.map((c, i) => (
        <Tile
          key={i}
          letter={c.letter}
          bonus={c.bonus}
          index={i}
          selected={selected.has(i)}
          onTap={onTap}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter client test Grid.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Grid.jsx client/src/components/Grid.test.jsx
git commit -m "feat(client): Grid component"
```

---

### Task 16: Timer component

**Files:**
- Create: `client/src/components/Timer.jsx`
- Test: `client/src/components/Timer.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/components/Timer.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timer } from "./Timer.jsx";

describe("Timer", () => {
  it("renders mm:ss format", () => {
    render(<Timer remainingMs={125_000} totalMs={120_000} />);
    expect(screen.getByText("2:05")).toBeInTheDocument();
  });
  it("renders 0:09 in danger style", () => {
    render(<Timer remainingMs={9_000} totalMs={120_000} />);
    const node = screen.getByText("0:09");
    expect(node.className).toMatch(/danger|red/i);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter client test Timer.test`
Expected: FAIL.

- [ ] **Step 3: Implement `client/src/components/Timer.jsx`**

```jsx
function format(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

export function Timer({ remainingMs, totalMs }) {
  const danger = remainingMs <= 10_000;
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  return (
    <div className="w-full">
      <div className={`tabular text-3xl font-display font-bold ${danger ? "text-danger animate-pulse" : "text-text-base"}`}>
        {format(remainingMs)}
      </div>
      <div className="h-1 bg-surface rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full ${danger ? "bg-danger" : "bg-primary"} transition-[width] duration-200`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter client test Timer.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Timer.jsx client/src/components/Timer.test.jsx
git commit -m "feat(client): Timer component"
```

---

### Task 17: WordList component

**Files:**
- Create: `client/src/components/WordList.jsx`
- Test: `client/src/components/WordList.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/components/WordList.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WordList } from "./WordList.jsx";

describe("WordList", () => {
  it("shows total and word rows", () => {
    render(<WordList words={[{ word: "CHAT", score: 9 }, { word: "CHIEN", score: 13 }]} />);
    expect(screen.getByText("CHAT")).toBeInTheDocument();
    expect(screen.getByText("CHIEN")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
  });
  it("renders empty state", () => {
    render(<WordList words={[]} />);
    expect(screen.getByText(/aucun mot/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter client test WordList`
Expected: FAIL.

- [ ] **Step 3: Implement `client/src/components/WordList.jsx`**

```jsx
import { motion, AnimatePresence } from "framer-motion";

export function WordList({ words }) {
  const total = words.reduce((s, w) => s + w.score, 0);
  return (
    <section className="bg-surface rounded-2xl p-4 w-full" aria-label="Mots trouvés">
      <header className="flex justify-between items-baseline mb-2">
        <h2 className="font-display font-semibold text-lg">Mots trouvés</h2>
        <span className="font-display font-bold text-accent text-2xl tabular">{total}</span>
      </header>
      {words.length === 0 ? (
        <p className="text-text-muted text-sm">Aucun mot pour le moment.</p>
      ) : (
        <ul className="divide-y divide-surface-2">
          <AnimatePresence initial={false}>
            {words.map((w, i) => (
              <motion.li
                key={`${w.word}-${i}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-between py-1 font-body"
              >
                <span>{w.word}</span>
                <span className="tabular text-text-muted">+{w.score}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter client test WordList`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/WordList.jsx client/src/components/WordList.test.jsx
git commit -m "feat(client): WordList with total and entrance animation"
```

---

### Task 18: EndForm component

**Files:**
- Create: `client/src/components/EndForm.jsx`
- Test: `client/src/components/EndForm.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/components/EndForm.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EndForm } from "./EndForm.jsx";

describe("EndForm", () => {
  it("calls onSubmit with trimmed pseudo", async () => {
    const onSubmit = vi.fn();
    render(<EndForm score={120} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/pseudo/i), "  alice  ");
    await userEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    expect(onSubmit).toHaveBeenCalledWith("alice");
  });
  it("shows validation error for empty pseudo", async () => {
    const onSubmit = vi.fn();
    render(<EndForm score={120} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    expect(screen.getByText(/pseudo requis/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter client test EndForm`
Expected: FAIL.

- [ ] **Step 3: Implement `client/src/components/EndForm.jsx`**

```jsx
import { useState } from "react";

export function EndForm({ score, onSubmit }) {
  const [pseudo, setPseudo] = useState("");
  const [error, setError] = useState(null);

  function handle(e) {
    e.preventDefault();
    const v = pseudo.trim();
    if (!v) { setError("Pseudo requis"); return; }
    if (!/^[A-Za-z0-9_\- ]{1,20}$/.test(v)) { setError("Caractères ou longueur invalides"); return; }
    setError(null);
    onSubmit(v);
  }

  return (
    <form onSubmit={handle} className="bg-surface rounded-2xl p-6 max-w-md w-full mx-auto">
      <h2 className="font-display text-2xl mb-2">Partie terminée</h2>
      <p className="mb-4">Score final : <span className="font-display text-accent text-3xl tabular">{score}</span></p>
      <label htmlFor="pseudo" className="block text-sm mb-1">Pseudo</label>
      <input
        id="pseudo"
        type="text"
        value={pseudo}
        onChange={(e) => setPseudo(e.target.value)}
        maxLength={20}
        autoComplete="nickname"
        className="w-full px-3 py-2 rounded-lg bg-surface-2 text-text-base focus:outline-none focus:ring-2 focus:ring-accent"
      />
      {error && <p role="alert" className="text-danger text-sm mt-1">{error}</p>}
      <button type="submit" className="mt-4 w-full bg-primary text-bg font-display font-bold py-2 rounded-lg">
        Enregistrer
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter client test EndForm`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/EndForm.jsx client/src/components/EndForm.test.jsx
git commit -m "feat(client): EndForm with pseudo validation"
```

---

### Task 19: Leaderboard component

**Files:**
- Create: `client/src/components/Leaderboard.jsx`
- Test: `client/src/components/Leaderboard.test.jsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/components/Leaderboard.test.jsx`:

```jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Leaderboard } from "./Leaderboard.jsx";

describe("Leaderboard", () => {
  it("renders rows in given order", () => {
    render(<Leaderboard rows={[{ pseudo: "a", score: 100 }, { pseudo: "b", score: 50 }]} />);
    const tds = screen.getAllByRole("cell");
    expect(tds[1]).toHaveTextContent("a");
    expect(tds[2]).toHaveTextContent("100");
  });
  it("shows empty state when no rows", () => {
    render(<Leaderboard rows={[]} />);
    expect(screen.getByText(/aucun score/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `pnpm --filter client test Leaderboard`
Expected: FAIL.

- [ ] **Step 3: Implement `client/src/components/Leaderboard.jsx`**

```jsx
export function Leaderboard({ rows }) {
  if (rows.length === 0) {
    return <p className="text-text-muted">Aucun score pour le moment.</p>;
  }
  return (
    <table className="w-full bg-surface rounded-2xl overflow-hidden">
      <thead>
        <tr className="text-left text-text-muted text-sm">
          <th className="p-3">#</th>
          <th className="p-3">Pseudo</th>
          <th className="p-3 text-right">Score</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.pseudo} className="border-t border-surface-2">
            <td className="p-3 tabular text-text-muted">{i + 1}</td>
            <td className="p-3 font-medium">{r.pseudo}</td>
            <td className="p-3 text-right font-display font-bold tabular text-accent">{r.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Verify pass**

Run: `pnpm --filter client test Leaderboard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Leaderboard.jsx client/src/components/Leaderboard.test.jsx
git commit -m "feat(client): Leaderboard table"
```

---

### Task 20: App state machine wiring

**Files:**
- Modify: `client/src/App.jsx`
- Create: `client/src/screens/Menu.jsx`
- Create: `client/src/screens/Game.jsx`
- Create: `client/src/screens/End.jsx`
- Create: `client/src/screens/LeaderboardScreen.jsx`

- [ ] **Step 1: Create `client/src/screens/Menu.jsx`**

```jsx
export function Menu({ onPlay, onLeaderboard }) {
  return (
    <section className="flex flex-col items-center gap-6 max-w-md mx-auto">
      <h1 className="font-display font-bold text-5xl md:text-6xl text-accent">Ruzzle FR</h1>
      <p className="text-text-muted text-center">Trouve un maximum de mots en 2 minutes.</p>
      <button onClick={onPlay} className="bg-primary text-bg font-display font-bold px-8 py-3 rounded-xl text-lg">
        Jouer
      </button>
      <button onClick={onLeaderboard} className="text-text-muted underline">
        Voir le classement
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Create `client/src/screens/Game.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Grid } from "../components/Grid.jsx";
import { Timer } from "../components/Timer.jsx";
import { WordList } from "../components/WordList.jsx";
import { usePathSelection } from "../hooks/usePathSelection.js";
import { useTimer } from "../hooks/useTimer.js";
import { fetchGrid, validateWord } from "../api.js";

const DURATION = 120_000;

export function Game({ onEnd }) {
  const [grid, setGrid] = useState(null);
  const [words, setWords] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const { path, tap, reset } = usePathSelection();
  const { remainingMs, running, start } = useTimer({
    durationMs: DURATION,
    onEnd: () => onEnd({ words, total: words.reduce((s, w) => s + w.score, 0) }),
  });

  useEffect(() => { fetchGrid().then(setGrid); }, []);

  function handleTap(i) {
    if (!running) start();
    tap(i);
  }

  async function submit() {
    if (!grid || path.length < 2) { reset(); return; }
    const word = path.map((i) => grid.cells[i].letter).join("");
    if (words.some((w) => w.word === word)) { setFeedback({ type: "dup", word }); reset(); return; }
    try {
      const r = await validateWord({ gridId: grid.gridId, path, word });
      if (r.valid) {
        setWords((arr) => [...arr, { word, score: r.score }]);
        setFeedback({ type: "ok", word, score: r.score });
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
        <Grid cells={grid.cells} path={path} onTap={handleTap} />
        <div className="flex gap-2 justify-center">
          <button onClick={submit} className="bg-primary text-bg font-display font-bold px-6 py-2 rounded-lg">
            Valider
          </button>
          <button onClick={reset} className="bg-surface px-6 py-2 rounded-lg">Effacer</button>
        </div>
        <p role="status" aria-live="polite" className="text-center text-sm h-5">
          {feedback?.type === "ok" && <span className="text-success">{feedback.word} +{feedback.score}</span>}
          {feedback?.type === "no" && <span className="text-danger">{feedback.word} — pas dans le dico</span>}
          {feedback?.type === "dup" && <span className="text-text-muted">{feedback.word} — déjà trouvé</span>}
          {feedback?.type === "err" && <span className="text-danger">{feedback.message}</span>}
        </p>
      </div>
      <WordList words={words} />
    </section>
  );
}
```

- [ ] **Step 3: Create `client/src/screens/End.jsx`**

```jsx
import { useEffect, useState } from "react";
import { EndForm } from "../components/EndForm.jsx";
import { Leaderboard } from "../components/Leaderboard.jsx";
import { submitScore, fetchLeaderboard } from "../api.js";

export function End({ total, onRestart, onMenu }) {
  const [submitted, setSubmitted] = useState(false);
  const [rank, setRank] = useState(null);
  const [board, setBoard] = useState([]);

  useEffect(() => { if (submitted) fetchLeaderboard(20).then(setBoard); }, [submitted]);

  async function handleSubmit(pseudo) {
    const r = await submitScore({ pseudo, score: total });
    setRank(r.rank);
    setSubmitted(true);
  }

  if (!submitted) return <EndForm score={total} onSubmit={handleSubmit} />;
  return (
    <section className="max-w-md mx-auto flex flex-col gap-4">
      <h2 className="font-display text-2xl">Classement</h2>
      <p className="text-text-muted">Ton rang : <span className="text-accent font-bold">#{rank}</span></p>
      <Leaderboard rows={board} />
      <div className="flex gap-2 justify-center">
        <button onClick={onRestart} className="bg-primary text-bg px-6 py-2 rounded-lg font-bold">Rejouer</button>
        <button onClick={onMenu} className="bg-surface px-6 py-2 rounded-lg">Menu</button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create `client/src/screens/LeaderboardScreen.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Leaderboard } from "../components/Leaderboard.jsx";
import { fetchLeaderboard } from "../api.js";

export function LeaderboardScreen({ onMenu }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { fetchLeaderboard(20).then(setRows); }, []);
  return (
    <section className="max-w-md mx-auto flex flex-col gap-4">
      <h2 className="font-display text-2xl">Classement</h2>
      <Leaderboard rows={rows} />
      <button onClick={onMenu} className="bg-surface px-6 py-2 rounded-lg">Menu</button>
    </section>
  );
}
```

- [ ] **Step 5: Replace `client/src/App.jsx`**

```jsx
import { useState } from "react";
import { Menu } from "./screens/Menu.jsx";
import { Game } from "./screens/Game.jsx";
import { End } from "./screens/End.jsx";
import { LeaderboardScreen } from "./screens/LeaderboardScreen.jsx";

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [finalTotal, setFinalTotal] = useState(0);

  return (
    <main className="min-h-dvh px-4 py-6 md:py-10 bg-bg text-text-base">
      {screen === "menu" && (
        <Menu onPlay={() => setScreen("game")} onLeaderboard={() => setScreen("leaderboard")} />
      )}
      {screen === "game" && (
        <Game onEnd={({ total }) => { setFinalTotal(total); setScreen("end"); }} />
      )}
      {screen === "end" && (
        <End total={finalTotal} onRestart={() => setScreen("game")} onMenu={() => setScreen("menu")} />
      )}
      {screen === "leaderboard" && (
        <LeaderboardScreen onMenu={() => setScreen("menu")} />
      )}
    </main>
  );
}
```

- [ ] **Step 6: Run all client tests**

Run: `pnpm --filter client test`
Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add client/src/App.jsx client/src/screens/
git commit -m "feat(client): wire screens (menu/game/end/leaderboard) into App"
```

---

### Task 21: End-to-end smoke test

**Files:**
- (no new files; manual smoke)

- [ ] **Step 1: Provide a small dictionary**

Create `server/data/dict.txt` (gitignored) containing at least:
```
CHAT
CHIEN
ABAT
RAT
ARTS
```

- [ ] **Step 2: Run the dev environment**

Run from repo root: `pnpm dev`
Expected: server logs "Loaded N words", client opens at http://localhost:5173.

- [ ] **Step 3: Manual checks**

- Click "Jouer" — grid renders with 16 tiles.
- Tap two adjacent tiles, then "Valider" — feedback shows whether word is valid (try one that you know exists in your dict).
- Wait or temporarily set `DURATION` to 5000 ms in Game.jsx to fast-forward end (revert after).
- End screen: enter "test", submit, see leaderboard row.
- Refresh page; revisit Leaderboard from menu; row persists.
- Resize to 375px width: layout reflows; tap targets ≥44px.
- Toggle `prefers-reduced-motion` in OS or DevTools: pulses/shakes muted.

- [ ] **Step 4: Lint and full test pass**

Run: `pnpm test && pnpm lint`
Expected: all green.

- [ ] **Step 5: Commit any tweaks** (if needed)

```bash
git add -p
git commit -m "chore: smoke-test fixes"
```

---

## Phase 3 — Polish

### Task 22: Reduced motion + extra a11y

**Files:**
- Modify: `client/src/components/Tile.jsx`
- Modify: `client/src/components/WordList.jsx`
- Modify: `client/src/components/Timer.jsx`

- [ ] **Step 1: Add reduced-motion utility**

Create `client/src/hooks/usePrefersReducedMotion.js`:

```js
import { useEffect, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const onChange = (e) => setReduced(e.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
```

- [ ] **Step 2: Apply in `Tile.jsx`**

Wrap the `whileTap` / `whileHover` props so they reduce to a 1.0 scale when `usePrefersReducedMotion()` is true. Replace the `motion.button` props block in `client/src/components/Tile.jsx`:

```jsx
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";
// inside Tile component:
const reduced = usePrefersReducedMotion();
// then on motion.button:
whileTap={reduced ? {} : { scale: 0.95 }}
whileHover={reduced ? {} : { scale: 1.05 }}
transition={reduced ? { duration: 0.08 } : { type: "spring", stiffness: 300, damping: 20 }}
```

- [ ] **Step 3: Apply in `Timer.jsx`**

Replace `animate-pulse` conditional with `${danger && !reduced ? "animate-pulse" : ""}`. Add `const reduced = usePrefersReducedMotion();` at the top of the component and import the hook.

- [ ] **Step 4: Apply in `WordList.jsx`**

Wrap `AnimatePresence` block: if `reduced`, set `initial={false}` and remove `y` translate in motion props (use `initial={{ opacity: 0 }} animate={{ opacity: 1 }}` only).

- [ ] **Step 5: Run tests**

Run: `pnpm --filter client test`
Expected: still passes (logic unchanged).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ client/src/hooks/usePrefersReducedMotion.js
git commit -m "feat(client): honor prefers-reduced-motion across animations"
```

---

### Task 23: README + final docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update `README.md` with usage details**

```markdown
# Ruzzle FR

Web implementation of the French Ruzzle word game.

## Stack

- Client: React 18, Vite, Tailwind CSS, Framer Motion
- Server: Node 20, Express, better-sqlite3, in-memory Trie
- Tests: Vitest, React Testing Library, Supertest

## Setup

1. Install pnpm 9+ and Node 20+.
2. \`pnpm install\`
3. Copy \`.env.example\` to \`.env\`.
4. Provide a French dictionary at \`server/data/dict.txt\` (one word per line; UTF-8). Words are normalized (uppercase, accents stripped) at load.
5. \`pnpm dev\` — client on http://localhost:5173, server on http://localhost:3001.

## Scripts

- \`pnpm dev\` — run client and server concurrently
- \`pnpm build\` — build the client for production
- \`pnpm test\` — run all Vitest suites
- \`pnpm lint\` — lint both packages

## Project layout

See \`docs/superpowers/specs/2026-05-15-ruzzle-game-design.md\` for the full design.

## API

| Method | Path | Description |
|---|---|---|
| GET | /api/grid | Generate a new grid and store it in the server cache (TTL 10 min). |
| POST | /api/validate | Validate a path+word against a cached grid; returns score. |
| POST | /api/scores | Upsert a score by pseudo (only if greater than existing). |
| GET | /api/scores?limit=N | Top scores, descending. |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: expand README with stack, setup, scripts, API"
```

---

## Final verification

- [ ] Run from repo root: `pnpm test && pnpm lint && pnpm build`
  Expected: all green, client build emits `client/dist/`.

- [ ] Manual smoke: full round → score submit → leaderboard refresh.

- [ ] Confirm `server/data/dict.txt` and `server/data/scores.sqlite` are gitignored.
