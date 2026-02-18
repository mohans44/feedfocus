const buckets = new Map();

const cleanupExpiredBuckets = (now) => {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

export const createRateLimiter = ({ windowMs, max }) => {
  if (!Number.isFinite(windowMs) || !Number.isFinite(max) || windowMs <= 0 || max <= 0) {
    throw new Error("Invalid rate limiter configuration");
  }

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.headers["x-forwarded-for"] || "anonymous";

    if (Math.random() < 0.01) {
      cleanupExpiredBuckets(now);
    }

    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      buckets.set(key, { count: 1, resetAt });
      res.setHeader("RateLimit-Limit", String(max));
      res.setHeader("RateLimit-Remaining", String(max - 1));
      res.setHeader("RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
      return next();
    }

    current.count += 1;
    const remaining = Math.max(max - current.count, 0);

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count > max) {
      return res.status(429).json({ error: "Too many requests" });
    }

    return next();
  };
};
