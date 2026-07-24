import cron from "node-cron";
import mongoose from "mongoose";
import redisClient from "../config/redisConfig.js";
import ListenEvent from "../models/ListenEvent.js";
import Track from "../models/Track.js";
import { getAnalyticsTimezone } from "../services/analytics/trackStatAggregation.service.js";
import {
    normalizeListenEventSource,
    VALID_STREAM_EVENT_QUEUE_KEY,
} from "../services/listenEvent/listenEvent.service.js";

const LISTEN_EVENT_SYNC_CRON_SCHEDULE =
    process.env.LISTEN_EVENT_SYNC_CRON_SCHEDULE || "*/1 * * * *";
const LISTEN_EVENT_SYNC_BATCH_SIZE = Number(process.env.LISTEN_EVENT_SYNC_BATCH_SIZE) || 100;

let isListenEventSyncCronStarted = false;

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const toNumber = (value, fallback = 0) => {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const parseBoolean = (value, fallback = false) => {
    if (value === "true" || value === true) {
        return true;
    }

    if (value === "false" || value === false) {
        return false;
    }

    return fallback;
};

const parseQueuedEventPayload = (entry) => {
    if (typeof entry !== "string" || entry.length === 0) {
        return {};
    }

    try {
        return JSON.parse(entry);
    } catch {
        return {};
    }
};

const transformQueuedEntryToDocument = (entry) => {
    const message = parseQueuedEventPayload(entry);

    return {
        userId: toObjectId(message.userId),
        trackId: toObjectId(message.trackId),
        artistId: toObjectId(message.artistId),
        listenedAt: message.listenedAt ? new Date(message.listenedAt) : new Date(),
        trackDuration: toNumber(message.trackDuration, null),
        listenedDuration: toNumber(message.listenedDuration, null),
        listenPercent: toNumber(message.listenPercent, null),
        dailyListenOrder: toNumber(message.dailyListenOrder, null),
        requiredPercent: toNumber(message.requiredPercent, null),
        source: normalizeListenEventSource(message.source),
        isValidStream: parseBoolean(message.isValidStream, true),
        duration: toNumber(message.duration, toNumber(message.listenedDuration, 0)),
        completed: parseBoolean(message.completed, true),
        skipped: parseBoolean(message.skipped, false),
    };
};

const buildTrackTotalPlayBulkOperations = (documents = []) => {
    const trackPlayCountMap = new Map();

    documents.forEach((document) => {
        if (!document?.trackId || document.isValidStream !== true) {
            return;
        }

        const trackId = String(document.trackId);
        trackPlayCountMap.set(trackId, (trackPlayCountMap.get(trackId) || 0) + 1);
    });

    return Array.from(trackPlayCountMap.entries()).map(([trackId, playCount]) => ({
        updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(trackId) },
            update: {
                $inc: {
                    "stats.totalPlay": playCount,
                },
            },
        },
    }));
};

export const syncListenEventsFromRedis = async (batchSize = LISTEN_EVENT_SYNC_BATCH_SIZE) => {
    if (!redisClient?.isOpen) {
        return {
            success: false,
            syncedCount: 0,
            message: "Redis is not connected. Listen event sync skipped.",
        };
    }

    const queueEntries = await redisClient.lRange(
        VALID_STREAM_EVENT_QUEUE_KEY,
        0,
        batchSize - 1
    );

    if (!Array.isArray(queueEntries) || queueEntries.length === 0) {
        return {
            success: true,
            syncedCount: 0,
            message: "No queued listen events found.",
        };
    }

    const documents = queueEntries.map(transformQueuedEntryToDocument);
    const trackTotalPlayOperations = buildTrackTotalPlayBulkOperations(documents);

    await ListenEvent.insertMany(documents, { ordered: true });

    if (trackTotalPlayOperations.length > 0) {
        await Track.bulkWrite(trackTotalPlayOperations, { ordered: false });
    }

    await redisClient.lTrim(
        VALID_STREAM_EVENT_QUEUE_KEY,
        queueEntries.length,
        -1
    );

    return {
        success: true,
        syncedCount: documents.length,
        updatedTrackCount: trackTotalPlayOperations.length,
        message: "Queued listen events synced successfully.",
    };
};

export const startListenEventSyncCron = () => {
    if (isListenEventSyncCronStarted) {
        return;
    }

    const analyticsTimezone = getAnalyticsTimezone();

    cron.schedule(
        LISTEN_EVENT_SYNC_CRON_SCHEDULE,
        async () => {
            try {
                const result = await syncListenEventsFromRedis();
                if (result.syncedCount > 0) {
                    console.log("[Cron] Listen event sync completed:", result);
                }
            } catch (error) {
                console.error("[Cron] Listen event sync failed:", error);
            }
        },
        {
            timezone: analyticsTimezone,
        }
    );

    console.log(
        `[Cron] Listen event sync scheduled with '${LISTEN_EVENT_SYNC_CRON_SCHEDULE}' (${analyticsTimezone}).`
    );

    isListenEventSyncCronStarted = true;
};

export default {
    syncListenEventsFromRedis,
    startListenEventSyncCron,
};
