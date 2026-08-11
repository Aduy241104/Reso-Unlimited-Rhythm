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

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export default {
    recordCompletedListenAttempt,
};
