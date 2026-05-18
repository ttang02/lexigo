import { describe, it, expect, vi, beforeEach } from "vitest";
import * as api from "./api.js";

beforeEach(() => { globalThis.fetch = vi.fn(); });

describe("api", () => {
  it("fetchGrid GETs /api/grid", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ gridId: "x", cells: [], seed: null }) });
    const r = await api.fetchGrid();
    expect(fetch).toHaveBeenCalledWith("/api/grid");
    expect(r.gridId).toBe("x");
  });
  it("validateWord POSTs payload", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ valid: true, score: 10 }) });
    const r = await api.validateWord({ gridId: "g", path: [0,1], word: "AB" });
    expect(fetch).toHaveBeenCalledWith("/api/validate", expect.objectContaining({ method: "POST" }));
    expect(r.valid).toBe(true);
  });
  it("submitScore POSTs and returns ok+rank", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, rank: 3 }) });
    const r = await api.submitScore({ pseudo: "a", score: 10 });
    expect(r.rank).toBe(3);
  });
  it("fetchLeaderboard GETs with limit", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ([]) });
    await api.fetchLeaderboard(20);
    expect(fetch).toHaveBeenCalledWith("/api/scores?limit=20");
  });
  it("throws on non-2xx", async () => {
    fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "bad" }) });
    await expect(api.fetchGrid()).rejects.toThrow(/bad/);
  });
  it("fetchSolution GETs /api/solve with gridId", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ solutions: [{ word: "CHAT", path: [0,1,2,3], score: 10 }] }),
    });
    const r = await api.fetchSolution("abc-123");
    expect(fetch).toHaveBeenCalledWith("/api/solve?gridId=abc-123");
    expect(r.solutions).toHaveLength(1);
    expect(r.solutions[0].word).toBe("CHAT");
  });
});
