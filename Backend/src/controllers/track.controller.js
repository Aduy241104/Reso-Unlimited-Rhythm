import trackService from "../services/track/track.service.js";
import formatResponse from "../utils/formatResponse.js";

const getTrackPlayback = async (req, res, next) => {
    try {
        const track = await trackService.getTrackPlayback(req.params.id, req.user);

        return formatResponse.success(
            res,
            { track },
            "Track playback fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getTrackPlayback,
};
