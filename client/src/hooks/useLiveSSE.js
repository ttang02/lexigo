import { useEffect, useRef, useState } from "react";

// Live updates over a WebSocket Durable Object (Cloudflare). Despite the legacy
// filename/export, this is no longer EventSource — it opens a WebSocket and
// applies the same auto-reconnect backoff (1s → 2s → 4s → ... → 10s cap).
// onMessage always sees the latest render's closure via a ref, so callers don't
// need to worry about stale state captured at subscribe time.
//
// The caller passes the same http(s) URLs they used for SSE; this hook converts
// the scheme to ws(s). Relative URLs (starting with "/") are resolved against
// window.location so callers never need to special-case dev vs prod.
function toWsUrl(url) {
  if (url.startsWith("/")) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${url}`;
  }
  return url.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

export function useLiveSSE(url, onMessage) {
  const [live, setLive] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!url) return;
    const wsUrl = toWsUrl(url);
    let ws = null;
    let retryMs = 1000;
    let retryTimer = null;
    let stopped = false;

    function connect() {
      ws = new WebSocket(wsUrl);
      // Guard so a failing socket (which fires BOTH onerror and onclose) only
      // schedules one reconnect.
      let scheduled = false;
      ws.onopen = () => {
        setLive(true);
        retryMs = 1000;
      };
      ws.onmessage = (e) => {
        try { onMessageRef.current(JSON.parse(e.data)); } catch { /* ignore */ }
      };
      const reconnect = () => {
        if (scheduled) return;
        scheduled = true;
        setLive(false);
        if (stopped) return;
        retryTimer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 10_000);
      };
      ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } reconnect(); };
      ws.onclose = () => reconnect();
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      if (ws) ws.close();
    };
  }, [url]);

  return live;
}
