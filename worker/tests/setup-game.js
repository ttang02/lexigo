/**
 * Vitest globalSetup — runs in Node.js (where fs is available).
 * Reads the real dictionary from disk and provides it to test files via
 * inject("dictText"), since the workers test pool can't `?raw`-import files.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export async function setup({ provide }) {
  const dictPath = resolve(__dirname, "../../server/data/dict.txt");
  const raw = await readFile(dictPath, "utf8");
  // Use only short words (2–4 letters). They are reliably reachable in a random
  // 4x4 grid, and keep the in-isolate Trie small so the test runtime stays light.
  const dictText = raw
    .split(/\r?\n/)
    .filter((w) => w.length >= 2 && w.length <= 4)
    .join("\n");
  provide("dictText", dictText);
}
