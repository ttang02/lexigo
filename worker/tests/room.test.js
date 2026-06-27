/**
 * Room Durable Object tests.
 * Runs inside the Workers runtime via @cloudflare/vitest-pool-workers (real DO).
 *
 * One DO instance == one 1v1 room, addressed by `code` via env.ROOM.idFromName(code).
 *
 * Internal protocol (path-based; see worker/src/room.js):
 *   POST /create  { gridId }            → { code, state }
 *   POST /join    { pseudo }            → 200 { playerId, state } | 409 { error, code }
 *   POST /score   { playerId, score }   → 200 { state } | 404 { error, code }
 *   POST /rematch { gridId }            → 200 { state }
 *   GET  /live    (Upgrade: websocket)  → 101 + WebSocket streaming publicState JSON
 *
 * publicState shape (must match prior SSE payload byte-for-byte in structure):
 *   { code, gridId, playerCount, players: [{ id, pseudo, score }] }
 */
import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";

function stubFor(code) {
  return env.ROOM.get(env.ROOM.idFromName(code));
}

// The router (Task 5) addresses the DO by name AND passes the code via the
// x-room-code header (a DO can't read its own name); the test mirrors that.
async function callDO(code, path, { method = "POST", body } = {}) {
  const stub = stubFor(code);
  const init = { method, headers: { "x-room-code": code } };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["content-type"] = "application/json";
  }
  const res = await stub.fetch(`http://room${path}`, init);
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

// Open a live WebSocket against a room and return the accepted client socket.
async function openLive(code) {
  const stub = stubFor(code);
  const res = await stub.fetch(`http://room/live`, {
    headers: { Upgrade: "websocket", "x-room-code": code },
  });
  expect(res.status).toBe(101);
  const ws = res.webSocket;
  expect(ws).toBeTruthy();
  ws.accept();
  return ws;
}

// Await the next JSON message from a socket (with a timeout guard).
function nextMessage(ws) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout waiting for message")), 2000);
    ws.addEventListener(
      "message",
      (evt) => {
        clearTimeout(timer);
        resolve(JSON.parse(evt.data));
      },
      { once: true }
    );
  });
}

const uniqueCode = () => `R${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

describe("Room DO — join + capacity", () => {
  it("a player can join an empty room and gets a playerId", async () => {
    const code = uniqueCode();
    await callDO(code, "/create", { body: { gridId: "grid-1" } });
    const { status, json } = await callDO(code, "/join", { body: { pseudo: "Alice" } });
    expect(status).toBe(200);
    expect(typeof json.playerId).toBe("string");
    expect(json.state.playerCount).toBe(1);
    expect(json.state.players[0]).toMatchObject({ pseudo: "Alice", score: 0 });
  });

  it("defaults the pseudo to Joueur", async () => {
    const code = uniqueCode();
    await callDO(code, "/create", { body: { gridId: "grid-1" } });
    const { json } = await callDO(code, "/join", { body: {} });
    expect(json.state.players[0].pseudo).toBe("Joueur");
  });

  it("rejects a third join (capacity is 2)", async () => {
    const code = uniqueCode();
    await callDO(code, "/create", { body: { gridId: "grid-1" } });
    await callDO(code, "/join", { body: { pseudo: "A" } });
    await callDO(code, "/join", { body: { pseudo: "B" } });
    const third = await callDO(code, "/join", { body: { pseudo: "C" } });
    expect(third.status).toBe(409);
    expect(third.json).toEqual({ error: "room full", code: "ROOM_FULL" });
  });
});

describe("Room DO — publicState shape", () => {
  it("matches { code, gridId, playerCount, players:[{id,pseudo,score}] }", async () => {
    const code = uniqueCode();
    await callDO(code, "/create", { body: { gridId: "grid-X" } });
    const { json } = await callDO(code, "/join", { body: { pseudo: "Solo" } });
    const s = json.state;
    expect(Object.keys(s).sort()).toEqual(["code", "gridId", "playerCount", "players"].sort());
    expect(s.code).toBe(code);
    expect(s.gridId).toBe("grid-X");
    expect(s.playerCount).toBe(1);
    expect(Object.keys(s.players[0]).sort()).toEqual(["id", "pseudo", "score"].sort());
  });
});

describe("Room DO — score updates broadcast over WebSocket", () => {
  it("updateScore broadcasts the new publicState to a connected socket", async () => {
    const code = uniqueCode();
    await callDO(code, "/create", { body: { gridId: "grid-1" } });
    const { json: joined } = await callDO(code, "/join", { body: { pseudo: "Alice" } });
    const playerId = joined.playerId;

    const ws = openLive(code);
    const socket = await ws;
    // On connect, the DO sends the current state immediately.
    const onConnect = await nextMessage(socket);
    expect(onConnect.code).toBe(code);
    expect(onConnect.players[0].score).toBe(0);

    // Now push a score; the live socket must receive the new state.
    const broadcast = nextMessage(socket);
    await callDO(code, "/score", { body: { playerId, score: 42 } });
    const pushed = await broadcast;
    const me = pushed.players.find((p) => p.id === playerId);
    expect(me.score).toBe(42);

    socket.close();
  });

  it("score on a missing player returns 404 PLAYER_MISSING", async () => {
    const code = uniqueCode();
    await callDO(code, "/create", { body: { gridId: "grid-1" } });
    const { status, json } = await callDO(code, "/score", {
      body: { playerId: "nope", score: 5 },
    });
    expect(status).toBe(404);
    expect(json).toEqual({ error: "player not found", code: "PLAYER_MISSING" });
  });
});

describe("Room DO — rematch", () => {
  it("resets every score to 0 and points at the new gridId", async () => {
    const code = uniqueCode();
    await callDO(code, "/create", { body: { gridId: "grid-1" } });
    const { json: a } = await callDO(code, "/join", { body: { pseudo: "A" } });
    const { json: b } = await callDO(code, "/join", { body: { pseudo: "B" } });
    await callDO(code, "/score", { body: { playerId: a.playerId, score: 30 } });
    await callDO(code, "/score", { body: { playerId: b.playerId, score: 70 } });

    const { status, json } = await callDO(code, "/rematch", { body: { gridId: "grid-2" } });
    expect(status).toBe(200);
    expect(json.state.gridId).toBe("grid-2");
    expect(json.state.players.every((p) => p.score === 0)).toBe(true);
  });
});
