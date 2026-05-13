import trackService from "../services/track/track.service.js";
import formatResponse from "../utils/formatResponse.js";

const createTrack = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const trackData = req.body;

        const track = await trackService.createTrack(userId, trackData);

        return formatResponse.success(
            res,
            { track },
            "Track created successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    createTrack,
};
