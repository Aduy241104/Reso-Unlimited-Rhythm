import userListfollowAlbumService from "../services/user/user.listfollowAlbum.service.js";
import formatResponse from "../utils/formatResponse.js";

const getUserListfollowAlbums = async (req, res, next) => {
    try {
        const { albums, pagination } = await userListfollowAlbumService.getUserListfollowAlbums(
            req.user.id,
            req.query
        );

        return formatResponse.success(
            res,
            { albums },
            "Followed albums fetched successfully",
            pagination
        );
    } catch (error) {
        next(error);
    }
};

const unfollowAlbum = async (req, res, next) => {
    try {
        const { albumId } = req.params;
        const userId = req.user.id;

        const result = await userListfollowAlbumService.unfollowAlbum(userId, albumId);

        return formatResponse.success(
            res,
            { albumId, isFollowing: false },
            "Album unfollowed successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getUserListfollowAlbums,
    unfollowAlbum,
};
