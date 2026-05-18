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
