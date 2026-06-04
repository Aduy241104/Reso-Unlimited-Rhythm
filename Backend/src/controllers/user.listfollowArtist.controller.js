import userListfollowArtistService from "../services/user/user.listfollowArtist.service.js";
import formatResponse from "../utils/formatResponse.js";

const getUserListfollowArtists = async (req, res, next) => {
    try {
        const { artists, pagination } = await userListfollowArtistService.getUserListfollowArtists(
            req.user.id,
            req.query
        );

        return formatResponse.success(
            res,
            { artists },
            "Followed artists fetched successfully",
            pagination
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getUserListfollowArtists,
};
