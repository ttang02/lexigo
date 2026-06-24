// Base URL for the API server. Empty in dev/test (relative paths hit the Vite
// proxy). In production set VITE_API_URL to the deployed server origin, e.g.
// https://lexigo-server.onrender.com — no trailing slash.
export const API_BASE = import.meta.env.VITE_API_URL || "";
