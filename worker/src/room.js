/**
 * Room — Durable Object for a single 1v1 match.
 *
 * One DO instance == one room, addressed by `code` via env.ROOM.idFromName(code).
 * It replaces, for that room, the Express server's in-memory RoomStore entry: it
 * owns the room's gridId, the (≤2) players and their live scores, and the set of
 * connected live WebSockets.
 *
 * The state logic mirrors server/src/rooms.js (RoomStore) but uses ONLY
 * Web/Workers APIs (crypto.randomUUID, WebSocketPair, hibernatable WebSockets) —
 * rooms.js itself is not imported because it depends on node:crypto.
 *
 * ─── Internal protocol (consumed by the Worker router in Task 5) ───
 *   POST /create  { gridId }            → 200 { code, state }
 *   POST /join    { pseudo }            → 200 { playerId, state }
 *                                       → 409 { error:"room full", code:"ROOM_FULL" }
 *   POST /score   { playerId, score }   → 200 { state }
 *                                       → 404 { error:"player not found", code:"PLAYER_MISSING" }
 *   POST /rematch { gridId }            → 200 { state }
 *   GET  /live    (Upgrade: websocket)  → 101 + WebSocket; the DO sends publicState
 *                                         on connect and re-broadcasts it after
 *                                         every state change. The socket is
 *                                         receive-only (server → client).
 *
 * publicState (the JSON each live socket receives — matches the prior SSE payload):
 *   { code, gridId, playerCount, players: [{ id, pseudo, score }] }
 *
 * Storage: a single key "room" → { gridId, players, createdAt }, where players is
 *   an array of [playerId, { pseudo, score }] entries (Maps don't serialize).
 *   Room TTL == 1 hour, tracked via createdAt (mirrors RoomStore.ttlMs).
 */

const TTL_MS = 3_600_000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const err = (error, code, status = 400) => json({ error, code }, status);

export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  // Load the stored room (or a fresh, empty one). The DO's name IS the code, but
  // the name isn't directly readable, so `code` is captured on first /create or
  // /join and persisted alongside the room.
  async _room() {
    const room = await this.ctx.storage.get("room");
    if (!room) return null;
    if (Date.now() - room.createdAt > TTL_MS) {
      await this.ctx.storage.delete("room");
      return null;
    }
    return room;
  }

  async _put(room) {
    await this.ctx.storage.put("room", room);
  }

  _ensure(room, code) {
    if (room) return room;
    return { code, gridId: null, players: [], createdAt: Date.now() };
  }

  // publicState — the broadcast/response payload. `players` is the stored
  // [id, {pseudo, score}] entries array.
  _publicState(room) {
    return {
      code: room.code,
      gridId: room.gridId,
      playerCount: room.players.length,
      players: room.players.map(([id, p]) => ({ id, pseudo: p.pseudo, score: p.score })),
    };
  }

  // Push the current publicState to every connected live socket.
  _broadcast(room) {
    const state = JSON.stringify(this._publicState(room));
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(state);
      } catch {
        /* socket already gone; hibernation API drops it on close */
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/live") {
      return this._opLive(request);
    }

    let body = {};
    if (request.method !== "GET") {
      body = await request.json().catch(() => ({}));
    }

    try {
      switch (path) {
        case "/create":
          return this._opCreate(request, body);
        case "/join":
          return this._opJoin(request, body);
        case "/score":
          return this._opScore(body);
        case "/rematch":
          return this._opRematch(body);
        default:
          return err("unknown operation", "UNKNOWN_OP", 404);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return json({ error: "internal error", code: "INTERNAL" }, 500);
    }
  }

  // The room code is the DO's name; the router passes it via x-room-code so the
  // persisted state and publicState carry it. Fall back to a path-derived value.
  _code(request) {
    return request.headers.get("x-room-code") || "ROOM";
  }

  // POST /create — (re)initialise this room at a gridId.
  async _opCreate(request, body) {
    const code = this._code(request);
    const room = { code, gridId: body.gridId ?? null, players: [], createdAt: Date.now() };
    await this._put(room);
    this._broadcast(room);
    return json({ code, state: this._publicState(room) });
  }

  // POST /join — add a player (capacity 2), assign a playerId, broadcast.
  async _opJoin(request, body) {
    const room = this._ensure(await this._room(), this._code(request));
    if (room.players.length >= 2) return err("room full", "ROOM_FULL", 409);
    const playerId = crypto.randomUUID();
    room.players.push([playerId, { pseudo: body.pseudo || "Joueur", score: 0 }]);
    await this._put(room);
    this._broadcast(room);
    return json({ playerId, state: this._publicState(room) });
  }

  // POST /score — set a player's score, broadcast.
  async _opScore(body) {
    const room = await this._room();
    if (!room) return err("room not found", "ROOM_MISSING", 404);
    const entry = room.players.find(([id]) => id === body.playerId);
    if (!entry) return err("player not found", "PLAYER_MISSING", 404);
    entry[1].score = body.score;
    await this._put(room);
    this._broadcast(room);
    return json({ state: this._publicState(room) });
  }

  // POST /rematch — reset all scores to 0, point at the new gridId, broadcast.
  async _opRematch(body) {
    const room = await this._room();
    if (!room) return err("room not found", "ROOM_MISSING", 404);
    for (const [, p] of room.players) p.score = 0;
    room.gridId = body.gridId ?? room.gridId;
    await this._put(room);
    this._broadcast(room);
    return json({ state: this._publicState(room) });
  }

  // GET /live — upgrade to a hibernatable WebSocket and send the current state.
  async _opLive(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return err("expected websocket", "UPGRADE_REQUIRED", 426);
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    const room = await this._room();
    if (room) {
      try {
        server.send(JSON.stringify(this._publicState(room)));
      } catch {
        /* race: client closed before first send */
      }
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  // Live sockets are receive-only; ignore inbound frames.
  webSocketMessage() {}

  webSocketClose(ws, code, reason, wasClean) {
    try {
      ws.close(code, reason);
    } catch {
      /* already closing */
    }
  }

  webSocketError() {}
}
