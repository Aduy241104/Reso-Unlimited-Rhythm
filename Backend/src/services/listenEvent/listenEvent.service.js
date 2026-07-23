import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import redisClient from "../../config/redisConfig.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import { getAnalyticsTimezone } from "../analytics/trackStatAggregation.service.js";
import { storeRecentListeningActivity } from "../user/userListeningAnalytics.service.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const VALID_STREAM_COUNT_KEY_PREFIX = "valid_stream_count";
export const VALID_STREAM_EVENT_QUEUE_KEY = "listen_event_queue";
export const VALID_STREAM_COUNT_TTL_SECONDS = 48 * 60 * 60;
export const SKIP_LISTEN_PERCENT_THRESHOLD = 15;
export const LISTEN_EVENT_SOURCE_ENUM = [
    "track_detail",
    "album",
    "playlist",
    "search",
    "artist_profile",
    "unknown",
];

const MAX_LISTEN_DURATION_BUFFER_SECONDS = 30;
const MIN_LISTEN_DURATION_BUFFER_SECONDS = 5;

const resolveDurationTolerance = (trackDuration) =>
    Math.min(
        Math.max(Math.ceil(Number(trackDuration || 0) * 0.1), MIN_LISTEN_DURATION_BUFFER_SECONDS),
        MAX_LISTEN_DURATION_BUFFER_SECONDS
    );

export const resolveRequiredPercent = (dailyListenOrder) => {
    if (dailyListenOrder <= 1) {
        return 40;
    }

    if (dailyListenOrder === 2) {
        return 60;
    }

    if (dailyListenOrder === 3) {
        return 80;
    }

    return 100;
};

export const buildValidStreamCountKey = ({ dateKey, userId, trackId }) =>
    `${VALID_STREAM_COUNT_KEY_PREFIX}:${dateKey}:${userId}:${trackId}`;

export const buildAnalyticsDateKey = (date = new Date()) =>
    dayjs(date).tz(getAnalyticsTimezone()).format("YYYY-MM-DD");

const roundToTwoDecimals = (value) => Number(value.toFixed(2));

const ensureRedisReady = () => {
    if (!redisClient?.isOpen) {
        throw new AppError("Valid stream tracking is temporarily unavailable.", 503);
    }
};

const parsePositiveInteger = (value, fallback = 0) => {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
};

export const normalizeListenEventSource = (value) => {
    const normalizedValue = typeof value === "string" ? value.trim() : "";
    return LISTEN_EVENT_SOURCE_ENUM.includes(normalizedValue)
        ? normalizedValue
        : "unknown";
};

const buildQueuedEventPayload = ({
    userId,
    trackId,
    artistId,
    listenedAt,
    trackDuration,
    listenedDuration,
    listenPercent,
    completed,
    skipped,
    isValidStream,
    dailyListenOrder,
    requiredPercent,
    source,
}) => {
    const payload = {
        userId: String(userId),
        trackId: String(trackId),
        artistId: String(artistId),
        listenedAt: listenedAt.toISOString(),
        trackDuration: String(trackDuration),
        listenedDuration: String(listenedDuration),
        listenPercent: String(listenPercent),
        duration: String(listenedDuration),
        completed: String(Boolean(completed)),
        skipped: String(Boolean(skipped)),
        isValidStream: String(Boolean(isValidStream)),
        source: normalizeListenEventSource(source),
    };

    if (Number.isFinite(dailyListenOrder) && dailyListenOrder > 0) {
        payload.dailyListenOrder = String(dailyListenOrder);
    }

    if (Number.isFinite(requiredPercent) && requiredPercent >= 0) {
        payload.requiredPercent = String(requiredPercent);
    }

    return payload;
};

const queueListenEventInRedis = async (payload) => {
    ensureRedisReady();

    await redisClient.rPush(
        VALID_STREAM_EVENT_QUEUE_KEY,
        JSON.stringify(payload)
    );
};

const queueSkippedListenInRedis = async ({
    userId,
    trackId,
    artistId,
    listenedAt,
    trackDuration,
    listenedDuration,
    listenPercent,
    source,
}) => {
    const queuedEventPayload = buildQueuedEventPayload({
        userId,
        trackId,
        artistId,
        listenedAt,
        trackDuration,
        listenedDuration,
        listenPercent,
        completed: false,
        skipped: true,
        isValidStream: false,
        source,
    });

    await queueListenEventInRedis(queuedEventPayload);
};

const queueValidStreamInRedis = async ({
    countKey,
    userId,
    trackId,
    artistId,
    listenedAt,
    trackDuration,
    listenedDuration,
    listenPercent,
    source,
}) => {
    ensureRedisReady();

    return redisClient.executeIsolated(async (isolatedClient) => {
        const maxAttempts = 5;

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            await isolatedClient.watch(countKey);

            const currentCount = parsePositiveInteger(await isolatedClient.get(countKey));
            const dailyListenOrder = currentCount + 1;
            const requiredPercent = resolveRequiredPercent(dailyListenOrder);

            if (listenPercent < requiredPercent) {
                await isolatedClient.unwatch();

                return {
                    isValidStream: false,
                    dailyListenOrder,
                    requiredPercent,
                };
            }

            const queuedEventPayload = buildQueuedEventPayload({
                userId,
                trackId,
                artistId,
                listenedAt,
                trackDuration,
                listenedDuration,
                listenPercent,
                completed: true,
                skipped: false,
                isValidStream: true,
                dailyListenOrder,
                requiredPercent,
                source,
            });

            const transactionResult = await isolatedClient
                .multi()
                .rPush(
                    VALID_STREAM_EVENT_QUEUE_KEY,
                    JSON.stringify(queuedEventPayload)
                )
                .incr(countKey)
                .expire(countKey, VALID_STREAM_COUNT_TTL_SECONDS)
                .exec();

            if (transactionResult !== null) {
                return {
                    isValidStream: true,
                    dailyListenOrder,
                    requiredPercent,
                    queuedCount: transactionResult[0],
                };
            }
        }

        throw new AppError("Could not validate this listen attempt right now. Please retry.", 409);
    });
};

export const recordCompletedListenAttempt = async ({
    userId,
    trackId,
    listenedDuration,
    source = "unknown",
}) => {
    if (!userId) {
        throw new AppError("User authentication is required.", 401);
    }

    const normalizedListenedDuration = Number(listenedDuration);

    if (!Number.isFinite(normalizedListenedDuration) || normalizedListenedDuration <= 0) {
        throw new AppError("Listened duration must be greater than 0.", 400, {
            field: "listenedDuration",
        });
    }

    const track = await Track.findById(trackId)
        .select("title artist_artistId album_albumId duration avatar coverImage activeStatus approvalStatus")
        .populate({ path: "artist_artistId", select: "name avatar" })
        .populate({ path: "album_albumId", select: "title coverImage" })
        .lean();

    if (!track) {
        throw new AppError("Track not found.", 404);
    }

    if (track.activeStatus !== "active" || track.approvalStatus !== "approved") {
        throw new AppError("Track is not available for streaming.", 400);
    }

    const trackDuration = Number(track.duration) || 0;

    if (trackDuration <= 0) {
        throw new AppError("Track duration is invalid for stream counting.", 400);
    }

    const artistId = track.artist_artistId?._id || track.artist_artistId;
    const albumId = track.album_albumId?._id || track.album_albumId || null;

    if (!artistId) {
        throw new AppError("Track artist information is missing.", 400);
    }

    const allowedDurationCeiling = trackDuration + resolveDurationTolerance(trackDuration);

    if (normalizedListenedDuration > allowedDurationCeiling) {
        throw new AppError("Listened duration exceeds the allowed playback window.", 400, {
            field: "listenedDuration",
        });
    }

    const clampedListenedDuration = Math.min(normalizedListenedDuration, trackDuration);
    const listenPercent = roundToTwoDecimals((clampedListenedDuration / trackDuration) * 100);
    const listenedAt = new Date();

    try {
        await storeRecentListeningActivity({
            userId,
            track,
            artistId,
            albumId,
            listenedAt,
            listenedDuration: clampedListenedDuration,
            listenPercent,
            source,
        });
    } catch (error) {
        console.error("[RecentListeningActivity] Could not store activity:", error);
    }

    if (listenPercent <= SKIP_LISTEN_PERCENT_THRESHOLD) {
        await queueSkippedListenInRedis({
            userId,
            trackId,
            artistId,
            listenedAt,
            trackDuration,
            listenedDuration: clampedListenedDuration,
            listenPercent,
            source,
        });

        return {
            success: true,
            isValidStream: false,
            isSkipped: true,
            listenPercent,
            message: `Listen counted as a skip because it stayed at or below ${SKIP_LISTEN_PERCENT_THRESHOLD}% of the track.`,
        };
    }

    const dateKey = buildAnalyticsDateKey(listenedAt);
    const countKey = buildValidStreamCountKey({
        dateKey,
        userId,
        trackId,
    });

    const queueResult = await queueValidStreamInRedis({
        countKey,
        userId,
        trackId,
        artistId,
        listenedAt,
        trackDuration,
        listenedDuration: clampedListenedDuration,
        listenPercent,
        source,
    });

    if (!queueResult.isValidStream) {
        return {
            success: true,
            isValidStream: false,
            isSkipped: false,
            listenPercent,
            requiredPercent: queueResult.requiredPercent,
            dailyListenOrder: queueResult.dailyListenOrder,
            message: "This listen attempt did not meet the required threshold.",
        };
    }

    return {
        success: true,
        isValidStream: true,
        isSkipped: false,
        listenPercent,
        requiredPercent: queueResult.requiredPercent,
        dailyListenOrder: queueResult.dailyListenOrder,
        message: "Stream counted successfully.",
    };
};

export default {
    recordCompletedListenAttempt,
    buildAnalyticsDateKey,
    buildValidStreamCountKey,
    resolveRequiredPercent,
    SKIP_LISTEN_PERCENT_THRESHOLD,
    VALID_STREAM_EVENT_QUEUE_KEY,
    normalizeListenEventSource,
};
