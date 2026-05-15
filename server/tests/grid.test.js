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
