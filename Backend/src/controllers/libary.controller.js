import libaryService from "../services/libary/libary.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyFollowedArtists = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const result = await libaryService.getMyFollowedArtistsByUserId(
            userId,
            req.query
        );

        return formatResponse.success(
            res,
            { artists: result.artists },
            "Followed artists fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyFollowedArtists,
};
