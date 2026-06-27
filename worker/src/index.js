/**
 * Lexigo Cloudflare Worker — entry point.
 *
 * This file currently contains only minimal stubs so that `wrangler deploy --dry-run`
 * succeeds with the Durable Object bindings declared in wrangler.jsonc.
 * Tasks 3–5 will replace these stubs with real game/room/leaderboard logic.
 */

import { GameRoom } from "./game-room.js";
import { Room } from "./room.js";
import { Leaderboard } from "./leaderboard.js";

export default {
  async fetch(request, env) {
    // Fall through to the static client assets.
    // Real API routing will be added in later tasks.
    return env.ASSETS.fetch(request);
  },
};

// Wrangler requires every Durable Object class to be exported from the main
// module. GameRoom (Task 3) is the authoritative single-grid game; Room and
// Leaderboard (Task 4) are the live 1v1-room and per-mode leaderboard DOs.
export { GameRoom, Room, Leaderboard };
