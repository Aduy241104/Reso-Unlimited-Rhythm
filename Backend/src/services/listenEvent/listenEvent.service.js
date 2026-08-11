import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import redisClient from "../../config/redisConfig.js";
import Podcast from "../../models/Podcast.js";
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
export const GUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const LISTEN_EVENT_SOURCE_ENUM = [
    "track_detail",
    "album",
    "playlist",
    "search",
    "artist_profile",
    "podcast_detail",
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

const resolveListenTargetKey = ({ contentType = "track", trackId, podcastId }) => {
    if (contentType === "podcast") {
        return `podcast:${podcastId}`;
    }

    return String(trackId);
};

export const buildValidStreamCountKey = ({
    dateKey,
    userId,
    guestId,
    contentType = "track",
    trackId,
    podcastId,
}) => {
    const listenerId = userId || guestId;
    const targetKey = resolveListenTargetKey({ contentType, trackId, podcastId });
    return `${VALID_STREAM_COUNT_KEY_PREFIX}:${dateKey}:${listenerId}:${targetKey}`;
};

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

const resolveListenerIdentity = ({ userId, guestId }) => {
    if (userId) {
        return {
            userId,
            guestId: undefined,
        };
    }

    const normalizedGuestId = typeof guestId === "string"
        ? guestId.trim().toLowerCase()
        : "";

    if (!normalizedGuestId) {
        throw new AppError("A user session or guestId is required.", 400, {
            field: "guestId",
        });
    }

    if (!GUEST_ID_PATTERN.test(normalizedGuestId)) {
        throw new AppError("guestId must be a valid UUID v4.", 400, {
            field: "guestId",
        });
    }

    return {
        userId: undefined,
        guestId: normalizedGuestId,
    };
};

export const normalizeListenEventSource = (value) => {
    const normalizedValue = typeof value === "string" ? value.trim() : "";
    return LISTEN_EVENT_SOURCE_ENUM.includes(normalizedValue)
        ? normalizedValue
        : "unknown";
};

const buildQueuedEventPayload = ({
    userId,
    guestId,
    contentType,
    trackId,
    podcastId,
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
        contentType,
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

    if (trackId) {
        payload.trackId = String(trackId);
    }

    if (podcastId) {
        payload.podcastId = String(podcastId);
    }

    if (artistId) {
        payload.artistId = String(artistId);
    }

    if (userId) {
        payload.userId = String(userId);
    } else {
        payload.guestId = guestId;
    }

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
    guestId,
    contentType,
    trackId,
    podcastId,
    artistId,
    listenedAt,
    trackDuration,
    listenedDuration,
    listenPercent,
    source,
}) => {
    const queuedEventPayload = buildQueuedEventPayload({
        userId,
        guestId,
        contentType,
        trackId,
        podcastId,
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
    guestId,
    contentType,
    trackId,
    podcastId,
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
                guestId,
                contentType,
                trackId,
                podcastId,
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

const resolveListenContentType = ({ contentType, trackId, podcastId }) => {
    const normalizedContentType = typeof contentType === "string"
        ? contentType.trim().toLowerCase()
        : "";

    if (normalizedContentType && !["track", "podcast"].includes(normalizedContentType)) {
        throw new AppError("contentType must be either track or podcast.", 400, {
            field: "contentType",
        });
    }

    const hasTrackId = Boolean(trackId);
    const hasPodcastId = Boolean(podcastId);

    if (hasTrackId === hasPodcastId) {
        throw new AppError("Exactly one of trackId or podcastId is required.", 400, {
            field: hasTrackId ? "podcastId" : "trackId",
        });
    }

    const inferredContentType = hasPodcastId ? "podcast" : "track";

    if (normalizedContentType && normalizedContentType !== inferredContentType) {
        throw new AppError("contentType does not match the supplied content id.", 400, {
            field: "contentType",
        });
    }

    return inferredContentType;
};

const getTrackListenContext = async (trackId) => {
    const track = await Track.findById(trackId)
        .select("title versionTitle artist_artistId album_albumId duration avatar coverImage activeStatus approvalStatus")
        .populate({ path: "artist_artistId", select: "name avatar" })
        .populate({ path: "album_albumId", select: "title coverImage" })
        .lean();

    if (!track) {
        throw new AppError("Track not found.", 404);
    }

    if (track.activeStatus !== "active" || track.approvalStatus !== "approved") {
        throw new AppError("Track is not available for streaming.", 400);
    }

    const duration = Number(track.duration) || 0;

    if (duration <= 0) {
        throw new AppError("Track duration is invalid for stream counting.", 400);
    }

    const artistId = track.artist_artistId?._id || track.artist_artistId;
    const albumId = track.album_albumId?._id || track.album_albumId || null;

    if (!artistId) {
        throw new AppError("Track artist information is missing.", 400);
    }

    return {
        content: track,
        duration,
        artistId,
        albumId,
    };
};

const getPodcastListenContext = async (podcastId) => {
    const podcast = await Podcast.findById(podcastId)
        .select("title creator duration audioUrl coverImageUrl approvalStatus visibility isBlocked releaseDate")
        .populate({ path: "creator", select: "name avatar" })
        .lean();

    if (!podcast) {
        throw new AppError("Podcast not found.", 404);
    }

    if (
        podcast.approvalStatus !== "approved" ||
        podcast.visibility !== "public" ||
        podcast.isBlocked
    ) {
        throw new AppError("Podcast is not available for streaming.", 400);
    }

    if (podcast.releaseDate && new Date(podcast.releaseDate).getTime() > Date.now()) {
        throw new AppError("Podcast is not released yet.", 400);
    }

    const duration = Number(podcast.duration) || 0;

    if (duration <= 0) {
        throw new AppError("Podcast duration is invalid for stream counting.", 400);
    }

    return {
        content: podcast,
        duration,
        artistId: null,
        albumId: null,
    };
};

export const recordCompletedListenAttempt = async ({
    userId,
    guestId,
    contentType,
    trackId,
    podcastId,
    listenedDuration,
    source = "unknown",
}) => {
    const listenerIdentity = resolveListenerIdentity({ userId, guestId });
    const resolvedContentType = resolveListenContentType({
        contentType,
        trackId,
        podcastId,
    });

    const normalizedListenedDuration = Number(listenedDuration);

    if (!Number.isFinite(normalizedListenedDuration) || normalizedListenedDuration <= 0) {
        throw new AppError("Listened duration must be greater than 0.", 400, {
            field: "listenedDuration",
        });
    }

    const {
        content,
        duration: contentDuration,
        artistId,
        albumId,
    } = resolvedContentType === "podcast"
        ? await getPodcastListenContext(podcastId)
        : await getTrackListenContext(trackId);

    const allowedDurationCeiling = contentDuration + resolveDurationTolerance(contentDuration);

    if (normalizedListenedDuration > allowedDurationCeiling) {
        throw new AppError("Listened duration exceeds the allowed playback window.", 400, {
            field: "listenedDuration",
        });
    }

    const clampedListenedDuration = Math.min(normalizedListenedDuration, contentDuration);
    const listenPercent = roundToTwoDecimals((clampedListenedDuration / contentDuration) * 100);
    const listenedAt = new Date();

    if (resolvedContentType === "track" && listenerIdentity.userId) {
        try {
            await storeRecentListeningActivity({
                userId: listenerIdentity.userId,
                track: content,
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
    }

    if (listenPercent <= SKIP_LISTEN_PERCENT_THRESHOLD) {
        await queueSkippedListenInRedis({
            ...listenerIdentity,
            contentType: resolvedContentType,
            trackId,
            podcastId,
            artistId,
            listenedAt,
            trackDuration: contentDuration,
            listenedDuration: clampedListenedDuration,
            listenPercent,
            source,
        });

        return {
            success: true,
            isValidStream: false,
            isSkipped: true,
            listenPercent,
            message: `Listen counted as a skip because it stayed at or below ${SKIP_LISTEN_PERCENT_THRESHOLD}% of the ${resolvedContentType}.`,
        };
    }

    const dateKey = buildAnalyticsDateKey(listenedAt);
    const countKey = buildValidStreamCountKey({
        dateKey,
        ...listenerIdentity,
        contentType: resolvedContentType,
        trackId,
        podcastId,
    });

    const queueResult = await queueValidStreamInRedis({
        countKey,
        ...listenerIdentity,
        contentType: resolvedContentType,
        trackId,
        podcastId,
        artistId,
        listenedAt,
        trackDuration: contentDuration,
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
