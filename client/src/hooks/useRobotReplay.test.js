import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRobotReplay } from "./useRobotReplay.js";

const SOLUTIONS = [
  { word: "AB", path: [0, 1], score: 5 },
  { word: "CD", path: [2, 3], score: 3 },
];

describe("useRobotReplay", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts idle with no active indices and not done", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    expect(result.current.idle).toBe(true);
    expect(result.current.done).toBe(false);
    expect(result.current.activeIndices.size).toBe(0);
    expect(result.current.currentEntry).toBeNull();
  });

  it("play() exits idle state", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    expect(result.current.idle).toBe(false);
  });

  it("skip() sets done immediately", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => result.current.skip());
    expect(result.current.done).toBe(true);
    expect(result.current.activeIndices.size).toBe(0);
  });

  it("after 120ms, first tile of first word is active", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(120); });
    expect(result.current.activeIndices.has(0)).toBe(true);
    expect(result.current.currentEntry?.word).toBe("AB");
  });

  it("after 240ms, both tiles of first word are active", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(240); });
    expect(result.current.activeIndices.has(0)).toBe(true);
    expect(result.current.activeIndices.has(1)).toBe(true);
  });

  it("after first word completes (240+600+300+150=1290ms), moves to second word", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(1290); });
    expect(result.current.currentEntry?.word).toBe("CD");
  });

  it("done after all words finish", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(2600); });
    expect(result.current.done).toBe(true);
    expect(result.current.activeIndices.size).toBe(0);
  });

  it("total equals solutions.length", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    expect(result.current.total).toBe(2);
  });

  it("wordIndex starts at 0 after play", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    expect(result.current.wordIndex).toBe(0);
  });
});
