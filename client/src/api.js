async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

export async function fetchGrid() {
  const r = await fetch("/api/grid");
  return json(r);
}

export async function fetchDailyGrid() {
  const r = await fetch("/api/daily");
  return json(r);
}

export async function validateWord({ gridId, path, word }) {
  const r = await fetch("/api/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gridId, path, word }),
  });
  return json(r);
}

export async function submitScore({ pseudo, gridId }) {
  // Score is derived server-side from the play session; we only send the grid.
  const r = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pseudo, gridId }),
  });
  return json(r);
}

export async function fetchLeaderboard(limit = 20) {
  const r = await fetch(`/api/scores?limit=${limit}`);
  return json(r);
}

export async function fetchSolution(gridId) {
  const r = await fetch(`/api/solve?gridId=${encodeURIComponent(gridId)}`);
  return json(r);
}

export async function fetchBots(gridId) {
  const r = await fetch(`/api/bots?gridId=${encodeURIComponent(gridId)}`);
  return json(r);
}

export async function fetchHint(gridId) {
  const r = await fetch("/api/hint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gridId }),
  });
  return json(r);
}
