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
    const cells = mkCells(["A:DL","B","C","D","E:DW", "X","X","X","X","X","X","X","X","X","X","X"]);
    expect(computeScore({ path: [0,1,2,3,4], cells })).toBe(27);
  });
});
