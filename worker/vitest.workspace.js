/**
 * Vitest workspace — two test environments:
 *
 *  1. "node-tests"    — Node.js environment for config.test.js (reads wrangler.jsonc via fs)
 *  2. "workers-tests" — @cloudflare/vitest-pool-workers for scores.test.js (needs real D1 binding)
 */
import { defineWorkspace } from "vitest/config";
import { defineWorkersProject } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkspace([
  // ── 1. Node tests ────────────────────────────────────────────────────────
  // Does NOT extend vitest.config.js so we control the include pattern exactly.
  {
    test: {
      name: "node-tests",
      environment: "node",
      include: ["tests/config.test.js"],
    },
  },

  // ── 2. Workers (D1) tests ─────────────────────────────────────────────────
  defineWorkersProject({
    test: {
      name: "workers-tests",
      include: [
        "tests/scores.test.js",
        "tests/game-room.test.js",
        "tests/room.test.js",
        "tests/leaderboard.test.js",
        "tests/index.test.js",
      ],
      pool: "@cloudflare/vitest-pool-workers",
      poolOptions: {
        workers: {
          wrangler: { configPath: "../wrangler.jsonc" },
          isolatedStorage: true,
          singleWorker: true,
        },
      },
      globalSetup: ["./tests/setup-d1.js", "./tests/setup-game.js"],
    },
  }),
]);
