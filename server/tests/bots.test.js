import { describe, it, expect } from "vitest";
import { buildBots, BOT_DEFS } from "../src/bots.js";

const SOLUTIONS = [
  { word: "ABATTOIR", path: [0], score: 30 },
  { word: "CHAT", path: [1], score: 9 },
  { word: "ZE", path: [2], score: 11 },
  { word: "RAT", path: [3], score: 3 },
  { word: "PORTE", path: [4], score: 12 },
  { word: "OS", path: [5], score: 2 },
];

const half = () => 0.5; // jitter factor 1.0 -> atMs increments by speedMs

describe("buildBots", () => {
  it("returns one timeline per bot definition", () => {
    const bots = buildBots(SOLUTIONS, { rng: half });
    expect(bots).toHaveLength(BOT_DEFS.length);
    expect(bots.map((b) => b.id).sort()).toEqual(
      BOT_DEFS.map((b) => b.id).sort()
    );
  });

  it("Glouton picks the longest word first", () => {
    const bots = buildBots(SOLUTIONS, { rng: half });
    const glouton = bots.find((b) => b.id === "glouton");
    expect(glouton.timeline[0].word).toBe("ABATTOIR");
  });

  it("Maximiseur picks the highest-scoring word first", () => {
    const bots = buildBots(SOLUTIONS, { rng: half });
    const max = bots.find((b) => b.id === "maximiseur");
    expect(max.timeline[0].word).toBe("ABATTOIR"); // score 30
  });

  it("Sprinteur picks the shortest word first and is fastest", () => {
    const bots = buildBots(SOLUTIONS, { rng: half });
    const sprint = bots.find((b) => b.id === "sprinteur");
    expect(sprint.timeline[0].word.length).toBeLessThanOrEqual(2);
    // first find at exactly its speedMs with rng=0.5
    expect(sprint.timeline[0].atMs).toBe(3500);
  });

  it("assigns strictly increasing timestamps within the game window", () => {
    const bots = buildBots(SOLUTIONS, { rng: half });
    for (const b of bots) {
      for (let i = 1; i < b.timeline.length; i++) {
        expect(b.timeline[i].atMs).toBeGreaterThan(b.timeline[i - 1].atMs);
        expect(b.timeline[i].atMs).toBeLessThanOrEqual(120_000);
      }
    }
  });

  it("total equals the sum of timeline scores", () => {
    const bots = buildBots(SOLUTIONS, { rng: half });
    for (const b of bots) {
      const sum = b.timeline.reduce((s, e) => s + e.score, 0);
      expect(b.total).toBe(sum);
    }
  });

  it("truncates the timeline to the game window", () => {
    const bots = buildBots(SOLUTIONS, { rng: half, gameMs: 4000 });
    const sprint = bots.find((b) => b.id === "sprinteur"); // speed 3500
    expect(sprint.timeline).toHaveLength(1); // 3500 ok, 7000 > 4000
    const glouton = bots.find((b) => b.id === "glouton"); // speed 6000
    expect(glouton.timeline).toHaveLength(0);
  });

  it("handles an empty solution set without crashing", () => {
    const bots = buildBots([], { rng: half });
    expect(bots).toHaveLength(BOT_DEFS.length);
    for (const b of bots) {
      expect(b.timeline).toEqual([]);
      expect(b.total).toBe(0);
    }
  });
});
