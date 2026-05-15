import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePathSelection } from "./usePathSelection.js";

describe("usePathSelection", () => {
  it("adds first tile and tracks path", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    expect(result.current.path).toEqual([0]);
  });
  it("adds adjacent tile (right)", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.tap(1));
    expect(result.current.path).toEqual([0, 1]);
  });
  it("adds diagonal adjacent tile", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.tap(5));
    expect(result.current.path).toEqual([0, 5]);
  });
  it("rejects non-adjacent tap", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.tap(2));
    expect(result.current.path).toEqual([0]);
  });
  it("rejects reuse", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.tap(1));
    act(() => result.current.tap(0));
    expect(result.current.path).toEqual([0, 1]);
  });
  it("tapping last tile is a no-op", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.tap(0));
    expect(result.current.path).toEqual([0]);
  });
  it("tapping second-to-last backtracks", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.tap(1));
    act(() => result.current.tap(2));
    act(() => result.current.tap(1));
    expect(result.current.path).toEqual([0, 1]);
  });
  it("reset clears the path", () => {
    const { result } = renderHook(() => usePathSelection());
    act(() => result.current.tap(0));
    act(() => result.current.reset());
    expect(result.current.path).toEqual([]);
  });
});
