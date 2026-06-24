import { API_BASE } from "./config.js";

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

export async function fetchGrid() {
  const r = await fetch(`${API_BASE}/api/grid`);
  return json(r);
}

export async function fetchDailyGrid() {
  const r = await fetch(`${API_BASE}/api/daily`);
  return json(r);
}

export async function validateWord({ gridId, path, word }) {
  const r = await fetch(`${API_BASE}/api/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gridId, path, word }),
  });
  return json(r);
}

export async function submitScore({ pseudo, gridId, mode = "normal" }) {
  // Score is derived server-side from the play session; we send grid + mode.
  const r = await fetch(`${API_BASE}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pseudo, gridId, mode }),
  });
  return json(r);
}

export async function fetchLeaderboard(mode = "normal", limit = 20) {
  const r = await fetch(`${API_BASE}/api/scores?mode=${mode}&limit=${limit}`);
  return json(r);
}

export async function fetchSolution(gridId) {
  const r = await fetch(`${API_BASE}/api/solve?gridId=${encodeURIComponent(gridId)}`);
  return json(r);
}

export async function fetchBots(gridId) {
  const r = await fetch(`${API_BASE}/api/bots?gridId=${encodeURIComponent(gridId)}`);
  return json(r);
}

export async function fetchHint(gridId) {
  const r = await fetch(`${API_BASE}/api/hint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gridId }),
  });
  return json(r);
}
