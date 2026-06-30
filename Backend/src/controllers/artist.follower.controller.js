import artistFollowerService from "../services/artist/artist.follower.service.js";

const getArtistFollowers = async (req, res, next) => {
    try {
        const loggedInUserId = req.user?._id || req.user?.id || req.user?.userId;
        const result = await artistFollowerService.getArtistFollowers(
            loggedInUserId,
            req.query
        );

        return res.status(200).json({
            success: true,
            message: "Get follower list successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export { getArtistFollowers };

export default {
    getArtistFollowers,
};
