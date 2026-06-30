import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLiveSSE } from "./useLiveSSE.js";

// Minimal fake WebSocket: tracks the URL it was opened with and exposes
// handlers the test drives manually (open/message/error/close).
let sockets = [];
class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    this.closed = false;
    sockets.push(this);
  }
  close() {
    this.closed = true;
    this.readyState = 3; // CLOSED
  }
  // test helpers
  emitOpen() {
    this.readyState = 1;
    this.onopen?.();
  }
  emitMessage(data) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  emitError() {
    this.onerror?.();
  }
}

const last = () => sockets[sockets.length - 1];

describe("useLiveSSE (WebSocket)", () => {
  beforeEach(() => {
    sockets = [];
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeWebSocket);
    // Default to an https page so relative-url conversion is deterministic.
    Object.defineProperty(window, "location", {
      writable: true,
      value: { protocol: "https:", host: "example.com" },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("converts http url to ws and https to wss", () => {
    const { unmount } = renderHook(() => useLiveSSE("http://api.test/live", () => {}));
    expect(last().url).toBe("ws://api.test/live");
    unmount();
    renderHook(() => useLiveSSE("https://api.test/live", () => {}));
    expect(last().url).toBe("wss://api.test/live");
  });

  it("builds an absolute ws url from window.location for a relative url", () => {
    renderHook(() => useLiveSSE("/api/scores/live?mode=normal", () => {}));
    // page is https → wss, host example.com
    expect(last().url).toBe("wss://example.com/api/scores/live?mode=normal");
  });

  it("delivers parsed JSON to onMessage on a message event", () => {
    const onMessage = vi.fn();
    renderHook(() => useLiveSSE("http://api.test/live", onMessage));
    act(() => last().emitMessage({ hello: "world" }));
    expect(onMessage).toHaveBeenCalledWith({ hello: "world" });
  });

  it("toggles live=true on open", () => {
    const { result } = renderHook(() => useLiveSSE("http://api.test/live", () => {}));
    expect(result.current).toBe(false);
    act(() => last().emitOpen());
    expect(result.current).toBe(true);
  });

  it("reconnects with 1→2→4→…→10s backoff on error", () => {
    renderHook(() => useLiveSSE("http://api.test/live", () => {}));
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    // First error → retry scheduled at 1000ms.
    act(() => last().emitError());
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    act(() => vi.advanceTimersByTime(1000));

    // Second error → 2000ms.
    act(() => last().emitError());
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 2000);
    act(() => vi.advanceTimersByTime(2000));

    // Third error → 4000ms.
    act(() => last().emitError());
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 4000);
    act(() => vi.advanceTimersByTime(4000));

    // 4th → 8000, 5th → capped at 10000.
    act(() => last().emitError());
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 8000);
    act(() => vi.advanceTimersByTime(8000));
    act(() => last().emitError());
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 10000);
    act(() => vi.advanceTimersByTime(10000));
    act(() => last().emitError());
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 10000);
  });

  it("resets backoff to 1s after a successful open", () => {
    renderHook(() => useLiveSSE("http://api.test/live", () => {}));
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    act(() => last().emitError());
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    act(() => vi.advanceTimersByTime(1000));
    act(() => last().emitError());
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 2000);
    act(() => vi.advanceTimersByTime(2000));

    // Reconnect succeeds → next failure should be back to 1000ms.
    act(() => last().emitOpen());
    act(() => last().emitError());
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);
  });

  it("closes the socket and stops reconnecting on unmount", () => {
    const { unmount } = renderHook(() => useLiveSSE("http://api.test/live", () => {}));
    const socket = last();
    unmount();
    expect(socket.closed).toBe(true);

    // No new socket should be created after unmount even as timers advance.
    const count = sockets.length;
    act(() => vi.advanceTimersByTime(20000));
    expect(sockets.length).toBe(count);
  });

  it("uses the latest onMessage via the ref pattern", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useLiveSSE("http://api.test/live", cb), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });
    act(() => last().emitMessage({ n: 1 }));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ n: 1 });
  });

  it("does not open a socket for a null url", () => {
    renderHook(() => useLiveSSE(null, () => {}));
    expect(sockets.length).toBe(0);
  });
});
