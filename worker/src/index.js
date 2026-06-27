/**
 * Lexigo Cloudflare Worker — entry point.
 *
 * This file currently contains only minimal stubs so that `wrangler deploy --dry-run`
 * succeeds with the Durable Object bindings declared in wrangler.jsonc.
 * Tasks 3–5 will replace these stubs with real game/room/leaderboard logic.
 */

import { GameRoom } from "./game-room.js";

export default {
  async fetch(request, env) {
    // Fall through to the static client assets.
    // Real API routing will be added in later tasks.
    return env.ASSETS.fetch(request);
  },
};

// The authoritative single-grid game Durable Object (Task 3) lives in
// game-room.js; wrangler requires the DO class exported from the main module.
export { GameRoom };

/**
 * Stub: multiplayer room coordinating 1v1 matches.
 * TODO (Task 4): implement room lifecycle and matchmaking.
 */
export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(_request) {
    return new Response("Room not yet implemented", { status: 501 });
  }
}

/**
 * Stub: per-mode leaderboard backed by D1.
 * TODO (Task 5): implement score reads/writes via env.DB.
 */
export class Leaderboard {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(_request) {
    return new Response("Leaderboard not yet implemented", { status: 501 });
  }
}
