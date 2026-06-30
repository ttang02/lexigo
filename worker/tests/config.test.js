/**
 * Config test: verifies wrangler.jsonc declares the required bindings.
 * Runs in Node environment (no Workers runtime needed for this test).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function stripJsoncComments(text) {
  // Remove single-line comments (// ...) and multi-line comments (/* ... */)
  return text
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("wrangler.jsonc bindings", () => {
  it("declares all six required bindings", () => {
    const raw = readFileSync(join(ROOT, "wrangler.jsonc"), "utf-8");
    const config = JSON.parse(stripJsoncComments(raw));

    // ASSETS binding (via assets.binding)
    expect(config.assets?.binding).toBe("ASSETS");

    // D1 database binding named DB
    const d1 = config.d1_databases ?? [];
    expect(d1.some((b) => b.binding === "DB")).toBe(true);

    // R2 bucket binding named DICTIONARY
    const r2 = config.r2_buckets ?? [];
    expect(r2.some((b) => b.binding === "DICTIONARY")).toBe(true);

    // Durable Object bindings: GAME, ROOM, LEADERBOARD
    const dos = config.durable_objects?.bindings ?? [];
    const doNames = dos.map((b) => b.name);
    expect(doNames).toContain("GAME");
    expect(doNames).toContain("ROOM");
    expect(doNames).toContain("LEADERBOARD");

    const migrations = config.migrations ?? [];
    expect(migrations.some((m) =>
      Array.isArray(m.new_sqlite_classes) &&
      m.new_sqlite_classes.includes("GameRoom") &&
      m.new_sqlite_classes.includes("Room") &&
      m.new_sqlite_classes.includes("Leaderboard")
    )).toBe(true);
  });
});
