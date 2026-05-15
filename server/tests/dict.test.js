import { describe, it, expect } from "vitest";
import { normalize, Trie } from "../src/dict.js";

describe("normalize", () => {
  it("uppercases and strips accents", () => {
    expect(normalize("éléphant")).toBe("ELEPHANT");
    expect(normalize("Çà")).toBe("CA");
    expect(normalize("naïve")).toBe("NAIVE");
    expect(normalize("œuf")).toBe("OEUF");
  });
  it("trims whitespace", () => {
    expect(normalize("  bonjour  ")).toBe("BONJOUR");
  });
});

describe("Trie", () => {
  it("inserts and looks up words", () => {
    const t = new Trie();
    t.insert("CHAT");
    t.insert("CHIEN");
    expect(t.hasWord("CHAT")).toBe(true);
    expect(t.hasWord("CHIEN")).toBe(true);
    expect(t.hasWord("CHA")).toBe(false);
    expect(t.hasWord("CHATS")).toBe(false);
  });
  it("supports prefix lookup", () => {
    const t = new Trie();
    t.insert("CHAT");
    expect(t.hasPrefix("CH")).toBe(true);
    expect(t.hasPrefix("CHAT")).toBe(true);
    expect(t.hasPrefix("CHATS")).toBe(false);
    expect(t.hasPrefix("XY")).toBe(false);
  });
  it("ignores non A-Z characters in lookup gracefully", () => {
    const t = new Trie();
    t.insert("CHAT");
    expect(t.hasWord("CH4T")).toBe(false);
  });
});
