import listenEventService from "../services/listenEvent/listenEvent.service.js";

const recordCompletedListenAttempt = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const result = await listenEventService.recordCompletedListenAttempt({
            userId,
            guestId: userId ? undefined : req.body.guestId,
            contentType: req.body.contentType,
            trackId: req.body.trackId,
            podcastId: req.body.podcastId,
            listenedDuration: req.body.listenedDuration,
            source: req.body.source,
        });

        console.log("[ListenEvent] Completion result:", {
            contentType: req.body.contentType || "track",
            trackId: req.body.trackId || null,
            podcastId: req.body.podcastId || null,
            listenedDuration: req.body.listenedDuration,
            isValidStream: result.isValidStream,
            isSkipped: result.isSkipped,
            requiredPercent: result.requiredPercent || null,
            dailyListenOrder: result.dailyListenOrder || null,
            message: result.message,
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("[ListenEvent] Completion failed:", {
            trackId: req.body?.trackId || null,
            podcastId: req.body?.podcastId || null,
            listenedDuration: req.body?.listenedDuration,
            name: error?.name,
            message: error?.message,
            code: error?.code,
            statusCode: error?.statusCode,
            stack: error?.stack,
        });
        next(error);
    }
};

export default {
    recordCompletedListenAttempt,
};
