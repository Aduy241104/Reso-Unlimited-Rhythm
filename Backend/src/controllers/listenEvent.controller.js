import listenEventService from "../services/listenEvent/listenEvent.service.js";

const recordCompletedListenAttempt = async (req, res, next) => {
    try {
        const result = await listenEventService.recordCompletedListenAttempt({
            userId: req.user.id,
            ...req.body,
        });

        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export default {
    recordCompletedListenAttempt,
};
