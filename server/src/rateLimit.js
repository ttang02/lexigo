// Minimal in-memory IP rate limiter. No deps.
// Fixed window counter per (route, ip). Capped store to avoid leaks.

export function createRateLimiter({ windowMs, max, store = new Map(), maxKeys = 10_000 } = {}) {
  return function rateLimit(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const entry = store.get(ip);
    if (!entry || now - entry.start > windowMs) {
      if (store.size >= maxKeys) {
        // Prefer evicting any expired entry first; fall back to oldest.
        let evicted = false;
        for (const [k, v] of store) {
          if (now - v.start > windowMs) { store.delete(k); evicted = true; break; }
        }
        if (!evicted) {
          const firstKey = store.keys().next().value;
          if (firstKey !== undefined) store.delete(firstKey);
        }
      }
      store.set(ip, { start: now, count: 1 });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.start + windowMs - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ error: "too many requests", code: "RATE_LIMIT" });
    }
    next();
  };
}
