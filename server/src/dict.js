export function normalize(s) {
  return s.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/œ/gi, "oe").replace(/æ/gi, "ae")
    .toUpperCase();
}

const A_CODE = "A".charCodeAt(0);
const ALPHABET = 26;

export class Trie {
  constructor() {
    this.root = { children: new Array(ALPHABET), terminal: false };
  }
  insert(word) {
    let node = this.root;
    for (const ch of word) {
      const idx = ch.charCodeAt(0) - A_CODE;
      if (idx < 0 || idx >= ALPHABET) return;
      if (!node.children[idx]) node.children[idx] = { children: new Array(ALPHABET), terminal: false };
      node = node.children[idx];
    }
    node.terminal = true;
  }
  _find(word) {
    let node = this.root;
    for (const ch of word) {
      const idx = ch.charCodeAt(0) - A_CODE;
      if (idx < 0 || idx >= ALPHABET) return null;
      node = node.children[idx];
      if (!node) return null;
    }
    return node;
  }
  hasWord(word) {
    const n = this._find(word);
    return !!n && n.terminal;
  }
  hasPrefix(prefix) {
    return !!this._find(prefix);
  }
  // Incremental traversal for DFS solvers: step one char from a node.
  // Returns child node or null. Avoids re-walking from root each step.
  childOf(node, ch) {
    const idx = ch.charCodeAt(0) - A_CODE;
    if (idx < 0 || idx >= ALPHABET) return null;
    return node.children[idx] || null;
  }
}

export async function loadDictionary(filePath, fs) {
  const raw = await fs.promises.readFile(filePath, "utf8");
  const trie = new Trie();
  let count = 0;
  for (const line of raw.split(/\r?\n/)) {
    const w = normalize(line);
    if (w.length >= 2 && w.length <= 16 && /^[A-Z]+$/.test(w)) {
      trie.insert(w);
      count++;
    }
  }
  return { trie, count };
}
