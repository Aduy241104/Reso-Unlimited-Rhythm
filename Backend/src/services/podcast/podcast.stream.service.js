import mongoose from "mongoose";
import Podcast from "../../models/Podcast.js";
import ListenEvent from "../../models/ListenEvent.js";
import { AppError } from "../../utils/AppError.js";
import { publicArtistMatch } from "../artist/artist.status.helper.js";
import { publicFilter } from "./podcast.public.service.js";

export const PODCAST_VALID_STREAM_PERCENT = 50;
const GUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LISTEN_EVENT_SOURCES = ["podcast_detail", "search", "unknown"];

const MAX_LISTEN_DURATION_BUFFER_SECONDS = 30;
const MIN_LISTEN_DURATION_BUFFER_SECONDS = 5;

const resolveDurationTolerance = (duration) =>
    Math.min(
        Math.max(Math.ceil(Number(duration || 0) * 0.1), MIN_LISTEN_DURATION_BUFFER_SECONDS),
        MAX_LISTEN_DURATION_BUFFER_SECONDS
    );

const roundToTwoDecimals = (value) => Number(value.toFixed(2));

const normalizeSource = (value) =>
    LISTEN_EVENT_SOURCES.includes(value) ? value : "podcast_detail";

const resolveListenerIdentity = ({ userId, guestId }) => {
    if (userId) {
        return { userId, guestId: undefined };
    }

    const normalizedGuestId = typeof guestId === "string"
        ? guestId.trim().toLowerCase()
        : "";

    if (!GUEST_ID_PATTERN.test(normalizedGuestId)) {
        throw new AppError("A user session or a valid guestId is required.", 400, {
            field: "guestId",
        });
    }

    return { userId: undefined, guestId: normalizedGuestId };
};

const getPublicPodcast = async (podcastId) => {
    if (!mongoose.isValidObjectId(podcastId)) {
        throw new AppError("Podcast not found.", 404, { code: "PODCAST_NOT_FOUND" });
    }

    const podcast = await Podcast.findOne({ _id: podcastId, ...publicFilter() })
        .populate({ path: "creator", match: publicArtistMatch, select: "_id" })
        .select("creator duration stats.totalListen")
        .lean();

    if (!podcast || !podcast.creator) {
        throw new AppError("Podcast not found.", 404, { code: "PODCAST_NOT_FOUND" });
    }

    const duration = Number(podcast.duration || 0);

    if (duration <= 0) {
        throw new AppError("Podcast duration is invalid for stream counting.", 400, {
            field: "listenedDuration",
        });
    }

    return { podcast, duration, artistId: podcast.creator._id };
};

export const recordPodcastStream = async ({
    podcastId,
    listenedDuration,
    userId,
    guestId,
    source = "podcast_detail",
}) => {
    const listenerIdentity = resolveListenerIdentity({ userId, guestId });
    const { podcast, duration, artistId } = await getPublicPodcast(podcastId);
    const normalizedListenedDuration = Number(listenedDuration);

    if (!Number.isFinite(normalizedListenedDuration) || normalizedListenedDuration <= 0) {
        throw new AppError("Listened duration must be greater than 0.", 400, {
            field: "listenedDuration",
        });
    }

    const allowedDurationCeiling = duration + resolveDurationTolerance(duration);

    if (normalizedListenedDuration > allowedDurationCeiling) {
        throw new AppError("Listened duration exceeds the allowed playback window.", 400, {
            field: "listenedDuration",
        });
    }

    const clampedListenedDuration = Math.min(normalizedListenedDuration, duration);
    const listenPercent = roundToTwoDecimals((clampedListenedDuration / duration) * 100);
    const isValidStream = listenPercent >= PODCAST_VALID_STREAM_PERCENT;
    const listenedAt = new Date();

    await ListenEvent.create({
        ...listenerIdentity,
        contentType: "podcast",
        podcastId,
        artistId,
        listenedAt,
        trackDuration: duration,
        listenedDuration: clampedListenedDuration,
        listenPercent,
        requiredPercent: PODCAST_VALID_STREAM_PERCENT,
        source: normalizeSource(source),
        isValidStream,
        duration: clampedListenedDuration,
        completed: isValidStream,
        skipped: !isValidStream && listenPercent <= 15,
    });

    if (!isValidStream) {
        return {
            success: true,
            counted: false,
            isValidStream: false,
            listenPercent,
            requiredPercent: PODCAST_VALID_STREAM_PERCENT,
            totalListen: Number(podcast.stats?.totalListen || 0),
            message: `Podcast stream is valid only after listening to at least ${PODCAST_VALID_STREAM_PERCENT}% of its duration.`,
        };
    }

    const updatedPodcast = await Podcast.findOneAndUpdate(
        { _id: podcastId, ...publicFilter() },
        { $inc: { "stats.totalListen": 1 } },
        { new: true, projection: { "stats.totalListen": 1 } }
    ).lean();

    if (!updatedPodcast) {
        throw new AppError("Podcast is no longer available for streaming.", 404, {
            code: "PODCAST_NOT_FOUND",
        });
    }

    return {
        success: true,
        counted: true,
        isValidStream: true,
        listenPercent,
        requiredPercent: PODCAST_VALID_STREAM_PERCENT,
        totalListen: Number(updatedPodcast.stats?.totalListen || 0),
        message: "Podcast stream counted successfully.",
    };
};

export default { recordPodcastStream, PODCAST_VALID_STREAM_PERCENT };
