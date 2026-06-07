import { randomBytes, randomUUID } from "node:crypto";

function genCode() {
  // 6 uppercase hex chars, e.g. "3FA2C1"
  return randomBytes(3).toString("hex").toUpperCase();
}

export class RoomStore {
  constructor({ ttlMs = 3_600_000, maxRooms = 500 } = {}) {
    this.ttlMs = ttlMs;
    this.maxRooms = maxRooms;
    this.store = new Map(); // code → room
  }

  _fresh(room) {
    return room && Date.now() - room.createdAt <= this.ttlMs;
  }

  create({ gridId }) {
    const code = genCode();
    const room = {
      code,
      gridId,
      createdAt: Date.now(),
      players: new Map(), // playerId → { pseudo, score }
      clients: new Set(), // SSE res objects
    };
    if (this.store.has(code)) return this.create({ gridId }); // rare collision retry
    this.store.set(code, room);
    if (this.store.size > this.maxRooms) {
      this.store.delete(this.store.keys().next().value);
    }
    return room;
  }

  get(code) {
    const room = this.store.get(String(code).toUpperCase());
    if (!this._fresh(room)) {
      if (room) this.store.delete(room.code);
      return null;
    }
    return room;
  }

  // Returns { playerId, room } or null if room full/missing.
  join(code, pseudo) {
    const room = this.get(code);
    if (!room) return null;
    if (room.players.size >= 2) return null;
    const playerId = randomUUID();
    room.players.set(playerId, { pseudo: pseudo || "Joueur", score: 0 });
    this._broadcast(room);
    return { playerId, room };
  }

  updateScore(code, playerId, score) {
    const room = this.get(code);
    if (!room) return null;
    const player = room.players.get(playerId);
    if (!player) return null;
    player.score = score;
    this._broadcast(room);
    return room;
  }

  addClient(code, res) {
    const room = this.get(code);
    if (!room) return false;
    room.clients.add(res);
    return true;
  }

  removeClient(code, res) {
    const room = this.get(code);
    if (room) room.clients.delete(res);
  }

  publicState(room) {
    return {
      code: room.code,
      gridId: room.gridId,
      playerCount: room.players.size,
      players: [...room.players.entries()].map(([id, p]) => ({
        id, pseudo: p.pseudo, score: p.score,
      })),
    };
  }

  _broadcast(room) {
    if (room.clients.size === 0) return;
    const payload = `data: ${JSON.stringify(this.publicState(room))}\n\n`;
    for (const res of room.clients) {
      try { res.write(payload); } catch { room.clients.delete(res); }
    }
  }
}
