/**
 * Vitest globalSetup — runs in Node.js.
 * Reads D1 migrations from disk and provides them to test files via inject().
 */
import { readD1Migrations } from "@cloudflare/vitest-pool-workers/config";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export async function setup({ provide }) {
  const migrationsPath = resolve(__dirname, "../../migrations");
  const migrations = await readD1Migrations(migrationsPath);
  provide("d1Migrations", migrations);
}
