/**
 * Leaderboard — Durable Object for one mode's live leaderboard.
 *
 * One DO instance == one mode, addressed via env.LEADERBOARD.idFromName(mode).
 * It replaces the Express server's per-mode SSE fan-out (`liveClients` +
 * `broadcastLeaderboard` in server/src/app.js): it holds the connected live
 * WebSockets, queries D1 (env.DB via topScores from scores.js), and pushes the
 * top-20 rows to every socket — on connect and on demand.
 *
 * Uses ONLY Web/Workers APIs (WebSocketPair, hibernatable WebSockets).
 *
 * ─── Internal protocol (consumed by the Worker router in Task 5) ───
 *   GET  /live (Upgrade: websocket)  → 101 + WebSocket; on connect the DO sends the
 *                                      current top-20 array for this mode.
 *   POST /broadcast                  → 200; re-queries D1 and pushes the fresh
 *                                      top-20 to all connected sockets. Task 5
 *                                      calls this after each /api/scores D1 write.
 *
 * The DO's name IS the mode; it's captured via the x-mode header (set by the
 * router) so D1 queries target the right rows.
 */
import { topScores } from "./scores.js";

const TOP_N = 20;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

export class Leaderboard {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  _mode(request) {
    return request.headers.get("x-mode") || "normal";
  }

  async _top(mode) {
    return topScores(this.env.DB, mode, TOP_N);
  }

  async _broadcast(mode) {
    const rows = JSON.stringify(await this._top(mode));
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(rows);
      } catch {
        /* socket already gone */
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const mode = this._mode(request);
    // Persist the mode so /broadcast (which may carry no header) still targets it.
    if (path === "/live" || path === "/broadcast") {
      await this.ctx.storage.put("mode", mode);
    }

    if (path === "/live") {
      return this._opLive(request, mode);
    }
    if (path === "/broadcast") {
      const stored = (await this.ctx.storage.get("mode")) || mode;
      await this._broadcast(stored);
      return json({ ok: true });
    }
    return json({ error: "unknown operation", code: "UNKNOWN_OP" }, 404);
  }

  async _opLive(request, mode) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return json({ error: "expected websocket", code: "UPGRADE_REQUIRED" }, 426);
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    try {
      server.send(JSON.stringify(await this._top(mode)));
    } catch {
      /* race: client closed before first send */
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage() {}

  webSocketClose(ws, code, reason) {
    try {
      ws.close(code, reason);
    } catch {
      /* already closing */
    }
  }

  webSocketError() {}
}
