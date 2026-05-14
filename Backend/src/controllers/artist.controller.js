import artistService from "../services/artist/artist.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyProfile = async (req, res, next) => {
    try {
        const artist = await artistService.getMyProfileByUserId(req.user.id);

        return formatResponse.success(
            res,
            { artist },
            "Artist profile fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyProfile,
};
