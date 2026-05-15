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
