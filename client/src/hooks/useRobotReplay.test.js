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

  it("starts idle with stepIndex 0 and not done", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    expect(result.current.idle).toBe(true);
    expect(result.current.done).toBe(false);
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.currentEntry).toBeNull();
  });

  it("play() exits idle state", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    expect(result.current.idle).toBe(false);
  });

  it("skip() sets done and resets stepIndex", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => result.current.skip());
    expect(result.current.done).toBe(true);
    expect(result.current.stepIndex).toBe(0);
  });

  it("after 200ms, stepIndex is 1 (first tile revealed)", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.currentEntry?.word).toBe("AB");
  });

  it("after 400ms, stepIndex is 2 (both tiles revealed)", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current.stepIndex).toBe(2);
  });

  it("isHolding = true when stepIndex equals path length (after 400ms)", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current.isHolding).toBe(true);
  });

  it("after first word completes (1950ms), moves to second word", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    // 200+200+900+400+250 = 1950ms
    act(() => { vi.advanceTimersByTime(1950); });
    expect(result.current.currentEntry?.word).toBe("CD");
  });

  it("done after all words finish", () => {
    const { result } = renderHook(() => useRobotReplay({ solutions: SOLUTIONS }));
    act(() => result.current.play());
    act(() => { vi.advanceTimersByTime(4000); });
    expect(result.current.done).toBe(true);
    expect(result.current.stepIndex).toBe(0);
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
