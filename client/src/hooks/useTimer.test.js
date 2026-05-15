import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimer } from "./useTimer.js";

describe("useTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts at given duration and is not running", () => {
    const { result } = renderHook(() => useTimer({ durationMs: 120_000 }));
    expect(result.current.remainingMs).toBe(120_000);
    expect(result.current.running).toBe(false);
  });
  it("ticks down once started", () => {
    const { result } = renderHook(() => useTimer({ durationMs: 5_000 }));
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(result.current.remainingMs).toBeLessThanOrEqual(4_000);
  });
  it("fires onEnd once when remaining reaches 0", () => {
    const onEnd = vi.fn();
    const { result } = renderHook(() => useTimer({ durationMs: 1_000, onEnd }));
    act(() => result.current.start());
    act(() => { vi.advanceTimersByTime(1_500); });
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.running).toBe(false);
  });
});
