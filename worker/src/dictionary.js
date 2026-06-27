/**
 * Dictionary loader for the Worker.
 *
 * Loads the private word list from R2 (`env.DICTIONARY.get("dict.txt")`) and
 * builds a Trie, reusing the same `Trie` + `normalize` + line filter as the
 * server's `loadDictionary` (length 2–16, /^[A-Z]+$/).
 *
 * The built Trie is cached in a module-level variable so it is constructed
 * once per isolate, not once per request. Concurrent first calls share a
 * single in-flight build promise.
 */
import { Trie, normalize } from "../../server/src/dict.js";

let _trie = null;
let _building = null;

/**
 * Build a Trie from raw dict.txt text using the canonical line filter.
 * @param {string} raw
 * @returns {Trie}
 */
function buildTrie(raw) {
  const trie = new Trie();
  for (const line of raw.split(/\r?\n/)) {
    const w = normalize(line);
    if (w.length >= 2 && w.length <= 16 && /^[A-Z]+$/.test(w)) {
      trie.insert(w);
    }
  }
  return trie;
}

/**
 * Return the dictionary Trie, building it from R2 on first call and caching
 * it for the lifetime of the isolate.
 * @param {{ DICTIONARY: R2Bucket }} env
 * @returns {Promise<Trie>}
 */
export async function getTrie(env) {
  if (_trie) return _trie;
  if (_building) return _building;
  _building = (async () => {
    const object = await env.DICTIONARY.get("dict.txt");
    if (!object) {
      _building = null;
      throw new Error("dictionary not found in R2 (DICTIONARY/dict.txt)");
    }
    const raw = await object.text();
    _trie = buildTrie(raw);
    _building = null;
    return _trie;
  })();
  return _building;
}
