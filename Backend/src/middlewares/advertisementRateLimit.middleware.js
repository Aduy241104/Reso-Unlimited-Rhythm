const buckets = new Map();

export const advertisementRateLimit = ({ windowMs = 60_000, max = 90 } = {}) => (req, res, next) => {
    const key = `${req.ip || req.socket?.remoteAddress || "unknown"}:${req.path}`;
    const now = Date.now();
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    if (buckets.size > 10_000) buckets.delete(buckets.keys().next().value);
    if (bucket.count > max) return res.status(429).json({ success: false, message: "Too many advertisement requests." });
    next();
};

export default advertisementRateLimit;
