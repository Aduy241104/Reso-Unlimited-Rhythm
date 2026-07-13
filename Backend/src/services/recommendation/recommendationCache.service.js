import redisClient from "../../config/redisConfig.js";
import {
    RECOMMENDATION_CACHE_TTL_SECONDS,
} from "./tasteProfile.service.js";

const buildDailyMixCacheKey = (userId, dateKey) =>
    `recommendation:daily-mix:${userId}:${dateKey}`;

const getDailyMixCache = async (userId, dateKey) => {
    if (!redisClient.isOpen) {
        return null;
    }

    const cacheKey = buildDailyMixCacheKey(userId, dateKey);

    try {
        const cachedPayload = await redisClient.get(cacheKey);

        if (!cachedPayload) {
            console.log(`[Recommendation] Redis miss for ${cacheKey}.`);
            return null;
        }

        console.log(`[Recommendation] Redis hit for ${cacheKey}.`);
        return JSON.parse(cachedPayload);
    } catch (error) {
        console.error("[Recommendation] Failed to read Redis cache:", error);
        return null;
    }
};

const setDailyMixCache = async (
    userId,
    dateKey,
    payload,
    ttlSeconds = RECOMMENDATION_CACHE_TTL_SECONDS
) => {
    if (!redisClient.isOpen) {
        return false;
    }

    const cacheKey = buildDailyMixCacheKey(userId, dateKey);

    try {
        await redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(payload));
        return true;
    } catch (error) {
        console.error("[Recommendation] Failed to write Redis cache:", error);
        return false;
    }
};

const deleteDailyMixCache = async (userId, dateKey) => {
    if (!redisClient.isOpen) {
        return 0;
    }

    const cacheKey = buildDailyMixCacheKey(userId, dateKey);

    try {
        return await redisClient.del(cacheKey);
    } catch (error) {
        console.error("[Recommendation] Failed to delete Redis cache:", error);
        return 0;
    }
};

export {
    buildDailyMixCacheKey,
    deleteDailyMixCache,
    getDailyMixCache,
    setDailyMixCache,
};

export default {
    buildDailyMixCacheKey,
    deleteDailyMixCache,
    getDailyMixCache,
    setDailyMixCache,
};
