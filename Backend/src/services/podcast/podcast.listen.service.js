import mongoose from "mongoose";
import Podcast from "../../models/Podcast.js";
import { AppError } from "../../utils/AppError.js";
import { publicFilter } from "./podcast.public.service.js";

const LISTEN_WINDOW_MS = 30 * 60 * 1000;
const recentListenKeys = new Map();

const getIdentity = ({ userId, sessionId, ip }) =>
    userId ? `user:${userId}` : sessionId ? `session:${sessionId}` : `ip:${ip || "unknown"}`;

const pruneRecentKeys = (now) => {
    for (const [key, timestamp] of recentListenKeys.entries()) {
        if (now - timestamp >= LISTEN_WINDOW_MS) recentListenKeys.delete(key);
    }
};

const recordPodcastListen = async ({ podcastId, listenedDuration = 0, userId, sessionId, ip }) => {
    if (!mongoose.isValidObjectId(podcastId)) throw new AppError("Podcast not found.", 404, { code: "PODCAST_NOT_FOUND" });
    const podcast = await Podcast.findOne({ _id: podcastId, ...publicFilter() }).select("duration stats.totalListen").lean();
    if (!podcast) throw new AppError("Podcast not found.", 404, { code: "PODCAST_NOT_FOUND" });

    const threshold = Math.min(30, Number(podcast.duration || 0) * 0.25);
    const listened = Number(listenedDuration || 0);
    if (listened < threshold) {
        return { counted: false, threshold, totalListen: Number(podcast.stats?.totalListen || 0) };
    }

    const now = Date.now();
    pruneRecentKeys(now);
    const key = `${getIdentity({ userId, sessionId, ip })}:podcast:${podcastId}`;
    const lastCountedAt = recentListenKeys.get(key);
    if (lastCountedAt && now - lastCountedAt < LISTEN_WINDOW_MS) {
        return { counted: false, duplicate: true, threshold, totalListen: Number(podcast.stats?.totalListen || 0) };
    }
    recentListenKeys.set(key, now);
    const updated = await Podcast.findOneAndUpdate(
        { _id: podcastId, ...publicFilter() },
        { $inc: { "stats.totalListen": 1 } },
        { new: true, projection: { "stats.totalListen": 1 } }
    ).lean();
    return { counted: true, threshold, totalListen: Number(updated?.stats?.totalListen || 0) };
};

export { recordPodcastListen, recentListenKeys };
