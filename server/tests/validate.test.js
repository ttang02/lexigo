import { describe, it, expect } from "vitest";
import { isPathValid, wordFromPath } from "../src/validate.js";

function cells(letters) {
  return letters.split("").map((l) => ({ letter: l, bonus: null }));
}

describe("isPathValid", () => {
  const c = cells("ABCDEFGHIJKLMNOP");

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
