import ListenEvent from "../../models/ListenEvent.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";

const THRESHOLD_PER_VIEW = {
    1: 0.25,
    2: 0.50,
    3: 0.75,
};

const MIN_DURATION_BEFORE_COUNT = 5;

const isTrackFulfillingThreshold = (listenedDuration, trackDuration, viewCount) => {
    if (listenedDuration < MIN_DURATION_BEFORE_COUNT) {
        return false;
    }

    if (viewCount >= 4) {
        return listenedDuration >= trackDuration;
    }

    const threshold = THRESHOLD_PER_VIEW[viewCount] ?? 1;
    return listenedDuration >= trackDuration * threshold;
};

export const recordListenEvent = async (userId, trackId, listenedDuration, skipped) => {
    if (!trackId) {
        throw new AppError("Track ID is required.", 400, { field: "trackId" });
    }

    const track = await Track.findById(trackId)
        .select("duration artist_artistId")
        .lean();

    if (!track) {
        throw new AppError("Track not found.", 404);
    }

    const artistId = track.artist_artistId ?? null;

    const previousEvents = await ListenEvent.find({
        userId,
        trackId,
    })
        .sort({ listenedAt: -1 })
        .lean();

    const previousCompleted = previousEvents.filter((e) => e.completed).length;
    const viewCount = previousCompleted;

    const isCompleted = isTrackFulfillingThreshold(
        listenedDuration,
        track.duration || 0,
        viewCount
    );

    const listenEvent = await ListenEvent.create({
        userId,
        trackId,
        artistId,
        duration: listenedDuration,
        listenedAt: new Date(),
        completed: isCompleted,
        skipped: skipped === true,
    });

    return {
        listenEvent: {
            _id: listenEvent._id,
            trackId: listenEvent.trackId,
            duration: listenEvent.duration,
            completed: listenEvent.completed,
            skipped: listenEvent.skipped,
            listenedAt: listenEvent.listenedAt,
        },
        meta: {
            viewCount,
            threshold: viewCount >= 4 ? 1 : (THRESHOLD_PER_VIEW[viewCount + 1] ?? 1),
            trackDuration: track.duration || 0,
        },
    };
};

export default { recordListenEvent };
