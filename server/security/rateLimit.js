const rateLimit = ({ windowMs = 60_000, limit = 120 } = {}) => {
  const buckets = new Map();
  return (req, res, next) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const entry = buckets.get(key) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + windowMs;
    }
    entry.count += 1;
    buckets.set(key, entry);
    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(limit - entry.count, 0));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.reset / 1000));
    if (entry.count > limit) {
      return res.status(429).json({ error: "Rate limit excedido" });
    }
    return next();
  };
};

module.exports = { rateLimit };
