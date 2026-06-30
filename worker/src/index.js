/**
 * Lexigo Cloudflare Worker — entry point and HTTP router.
 *
 * Reproduces the Express app (server/src/app.js) API surface 1:1, but backed by
 * Cloudflare primitives:
 *   - GameRoom DO   (env.GAME)        — authoritative single-grid game state.
 *   - Room DO       (env.ROOM)        — live 1v1 rooms.
 *   - Leaderboard DO(env.LEADERBOARD) — per-mode live leaderboard fan-out.
 *   - D1            (env.DB)          — persisted scores (worker/src/scores.js).
 *   - Static assets (env.ASSETS)      — the built client (SPA), with index.html
 *                                       fallback for client-side routes.
 *
 * All payloads and {error,code} shapes match the Express app exactly.
 */

import { GameRoom } from "./game-room.js";
import { Room } from "./room.js";
import { Leaderboard } from "./leaderboard.js";
import { topScores, upsertScore, rankAndCount } from "./scores.js";

// At least one alphanumeric; only alnum, space, underscore, hyphen; 1-20 chars.
const PSEUDO_RE = /^(?=.*[A-Za-z0-9])[A-Za-z0-9_\- ]{1,20}$/;
const SCORE_MODES = new Set(["normal", "bombe", "daily"]);

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });

const err = (error, code, status = 400, extraHeaders = {}) =>
  json({ error, code }, status, extraHeaders);

// ─── CORS (mirrors server buildCorsOptions) ──────────────────────────────────
// env.CORS_ORIGIN: comma list of allowed origins, or "*"/unset → allow all.
function corsHeaders(request, env) {
  const raw = env.CORS_ORIGIN;
  const origin = request.headers.get("Origin");
  let allow = "*";
  if (raw && raw !== "*") {
    const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
    allow = origin && list.includes(origin) ? origin : list[0] || "*";
  } else if (origin) {
    // Echo the caller's origin so credentials work even with the wildcard intent.
    allow = origin;
  }
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  };
}

// Address a named DO and forward a path-based request, injecting the id header.
function doStub(namespace, name) {
  return namespace.get(namespace.idFromName(name));
}

async function callDO(namespace, name, path, { method = "POST", body, headerName, headerValue } = {}) {
  const stub = doStub(namespace, name);
  const init = { method, headers: {} };
  if (headerName) init.headers[headerName] = headerValue ?? name;
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers["content-type"] = "application/json";
  }
  const res = await stub.fetch(`http://do${path}`, init);
  const data = await res.json().catch(() => null);
  return { status: res.status, json: data };
}

// Pass a DO response straight back to the client, attaching CORS headers.
function relay({ status, json: data }, cors) {
  return json(data, status, cors);
}

// ─── API handlers ────────────────────────────────────────────────────────────

async function handleGrid(request, env, cors) {
  const gridId = crypto.randomUUID();
  const r = await callDO(env.GAME, gridId, "/grid", {
    headerName: "x-grid-id",
    headerValue: gridId,
  });
  return relay(r, cors);
}

async function handleDaily(request, env, cors) {
  const date = new Date().toISOString().slice(0, 10);
  const gridId = `daily-${date}`;
  const r = await callDO(env.GAME, gridId, "/daily", {
    body: { date },
    headerName: "x-grid-id",
    headerValue: gridId,
  });
  return relay(r, cors);
}

async function handleValidate(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const { gridId, path, word } = body || {};
  if (!gridId) return err("grid expired or unknown", "GRID_MISSING", 400, cors);
  const r = await callDO(env.GAME, gridId, "/validate", { body: { path, word } });
  return relay(r, cors);
}

async function handleHint(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const { gridId } = body || {};
  if (!gridId) return err("grid expired or unknown", "GRID_MISSING", 400, cors);
  const r = await callDO(env.GAME, gridId, "/hint", { body: {} });
  return relay(r, cors);
}

async function handleSolve(request, env, cors, url) {
  const gridId = url.searchParams.get("gridId");
  if (!gridId) return err("grid expired or unknown", "GRID_MISSING", 400, cors);
  const r = await callDO(env.GAME, gridId, "/solve", { body: {} });
  return relay(r, cors);
}

async function handleBots(request, env, cors, url) {
  const gridId = url.searchParams.get("gridId");
  if (!gridId) return err("grid expired or unknown", "GRID_MISSING", 400, cors);
  const r = await callDO(env.GAME, gridId, "/bots", { body: {} });
  return relay(r, cors);
}

async function handleScoresGet(request, env, cors, url) {
  const limit = Math.min(parseInt(url.searchParams.get("limit"), 10) || 20, 100);
  const mode = SCORE_MODES.has(url.searchParams.get("mode")) ? url.searchParams.get("mode") : "normal";
  const rows = await topScores(env.DB, mode, limit);
  return json(rows, 200, cors);
}

async function handleScoresPost(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const { pseudo, gridId, mode } = body || {};
  const cleanPseudo = typeof pseudo === "string" ? pseudo.trim().replace(/\s+/g, " ") : "";
  if (!PSEUDO_RE.test(cleanPseudo)) return err("invalid pseudo", "PSEUDO_INVALID", 400, cors);
  const m = SCORE_MODES.has(mode) ? mode : "normal";

  // The grid's DO owns the authoritative session total.
  const totalRes = await callDO(env.GAME, gridId, "/total", { body: {} });
  if (totalRes.status !== 200) return relay(totalRes, cors);
  const score = totalRes.json.total;

  await upsertScore(env.DB, { pseudo: cleanPseudo, score, mode: m, now: Date.now() });
  const { rank, total } = await rankAndCount(env.DB, cleanPseudo, m);

  // Poke the per-mode leaderboard so live watchers refresh.
  await callDO(env.LEADERBOARD, m, "/broadcast", {
    body: {},
    headerName: "x-mode",
    headerValue: m,
  });

  return json({ ok: true, score, rank, total }, 200, cors);
}

// WebSocket upgrade → forward to the Leaderboard DO, return its 101 verbatim.
async function handleScoresLive(request, env, url) {
  const mode = SCORE_MODES.has(url.searchParams.get("mode")) ? url.searchParams.get("mode") : "normal";
  const stub = doStub(env.LEADERBOARD, mode);
  const headers = new Headers(request.headers);
  headers.set("x-mode", mode);
  return stub.fetch("http://do/live", { headers });
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

async function handleRoomCreate(request, env, cors) {
  const gridId = crypto.randomUUID();
  const grid = await callDO(env.GAME, gridId, "/grid", {
    headerName: "x-grid-id",
    headerValue: gridId,
  });
  const cells = grid.json.cells;
  // 6 uppercase hex chars.
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const code = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  await callDO(env.ROOM, code, "/create", {
    body: { gridId },
    headerName: "x-room-code",
    headerValue: code,
  });
  return json({ code, gridId, cells }, 200, cors);
}

async function handleRoomJoin(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "").toUpperCase();
  const r = await callDO(env.ROOM, code, "/join", {
    body: { pseudo: body.pseudo },
    headerName: "x-room-code",
    headerValue: code,
  });
  if (r.status !== 200) return err("Room not found or full", "ROOM_ERROR", 400, cors);
  const gridId = r.json.state.gridId;
  const cellsRes = await callDO(env.GAME, gridId, "/cells", { body: {} });
  if (cellsRes.status !== 200) return relay(cellsRes, cors);
  return json({ code, gridId, cells: cellsRes.json.cells, playerId: r.json.playerId }, 200, cors);
}

async function handleRoomLive(request, env, code) {
  // Confirm the room exists before upgrading (parity with the 404 in Express).
  const stateRes = await callDO(env.ROOM, code, "/state", {
    body: {},
    headerName: "x-room-code",
    headerValue: code,
  });
  if (stateRes.status !== 200 || !stateRes.json?.state?.code) {
    return json({ error: "Room not found" }, 404);
  }
  const stub = doStub(env.ROOM, code);
  const headers = new Headers(request.headers);
  headers.set("x-room-code", code);
  return stub.fetch("http://do/live", { headers });
}

async function handleRoomScore(request, env, cors, code) {
  const body = await request.json().catch(() => ({}));
  const r = await callDO(env.ROOM, code, "/score", {
    body: { playerId: body.playerId, score: Number(body.score) || 0 },
    headerName: "x-room-code",
    headerValue: code,
  });
  if (r.status !== 200) return err("Invalid room or player", "ROOM_ERROR", 400, cors);
  return json({ ok: true }, 200, cors);
}

async function handleRoomGet(request, env, cors, code) {
  const stateRes = await callDO(env.ROOM, code, "/state", {
    body: {},
    headerName: "x-room-code",
    headerValue: code,
  });
  if (stateRes.status !== 200 || !stateRes.json?.state?.code) {
    return err("Room not found", "ROOM_ERROR", 404, cors);
  }
  const gridId = stateRes.json.state.gridId;
  const cellsRes = await callDO(env.GAME, gridId, "/cells", { body: {} });
  if (cellsRes.status !== 200) return relay(cellsRes, cors);
  return json({ code, gridId, cells: cellsRes.json.cells }, 200, cors);
}

async function handleRoomRematch(request, env, cors, code) {
  const gridId = crypto.randomUUID();
  const grid = await callDO(env.GAME, gridId, "/grid", {
    headerName: "x-grid-id",
    headerValue: gridId,
  });
  const cells = grid.json.cells;
  const r = await callDO(env.ROOM, code, "/rematch", {
    body: { gridId },
    headerName: "x-room-code",
    headerValue: code,
  });
  if (r.status !== 200) return err("Invalid room", "ROOM_ERROR", 400, cors);
  return json({ gridId, cells }, 200, cors);
}

// ─── SPA assets fallback ─────────────────────────────────────────────────────
async function serveAssets(request, env) {
  const res = await env.ASSETS.fetch(request);
  if (res.status !== 404) return res;
  // SPA fallback: serve index.html for unknown client-side routes.
  const url = new URL(request.url);
  url.pathname = "/index.html";
  return env.ASSETS.fetch(new Request(url, request));
}

// ─── Router ──────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (!pathname.startsWith("/api/")) {
      return serveAssets(request, env);
    }

    const cors = corsHeaders(request, env);

    // CORS preflight.
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      // WebSocket upgrades — forwarded before generic dispatch.
      if (pathname === "/api/scores/live") {
        return await handleScoresLive(request, env, url);
      }
      const roomLive = pathname.match(/^\/api\/rooms\/([^/]+)\/live$/);
      if (roomLive) {
        return await handleRoomLive(request, env, roomLive[1].toUpperCase());
      }

      // Static, non-parameterised routes.
      if (pathname === "/api/grid" && request.method === "GET") return await handleGrid(request, env, cors);
      if (pathname === "/api/daily" && request.method === "GET") return await handleDaily(request, env, cors);
      if (pathname === "/api/validate" && request.method === "POST") return await handleValidate(request, env, cors);
      if (pathname === "/api/hint" && request.method === "POST") return await handleHint(request, env, cors);
      if (pathname === "/api/solve" && request.method === "GET") return await handleSolve(request, env, cors, url);
      if (pathname === "/api/bots" && request.method === "GET") return await handleBots(request, env, cors, url);
      if (pathname === "/api/scores" && request.method === "GET") return await handleScoresGet(request, env, cors, url);
      if (pathname === "/api/scores" && request.method === "POST") return await handleScoresPost(request, env, cors);
      if (pathname === "/api/rooms" && request.method === "POST") return await handleRoomCreate(request, env, cors);
      if (pathname === "/api/rooms/join" && request.method === "POST") return await handleRoomJoin(request, env, cors);

      // Parameterised room routes.
      const roomScore = pathname.match(/^\/api\/rooms\/([^/]+)\/score$/);
      if (roomScore && request.method === "POST") {
        return await handleRoomScore(request, env, cors, roomScore[1].toUpperCase());
      }
      const roomRematch = pathname.match(/^\/api\/rooms\/([^/]+)\/rematch$/);
      if (roomRematch && request.method === "POST") {
        return await handleRoomRematch(request, env, cors, roomRematch[1].toUpperCase());
      }
      const roomGet = pathname.match(/^\/api\/rooms\/([^/]+)$/);
      if (roomGet && request.method === "GET") {
        return await handleRoomGet(request, env, cors, roomGet[1].toUpperCase());
      }

      return err("not found", "NOT_FOUND", 404, cors);
    } catch (e) {
      console.error(e);
      return err("internal error", "INTERNAL", 500, cors);
    }
  },
};

// Wrangler requires every Durable Object class to be exported from the main module.
export { GameRoom, Room, Leaderboard };
