import albumService from "../services/album/album.service.js";
import formatResponse from "../utils/formatResponse.js";

const getAlbumList = async (req, res, next) => {
    try {
        const result = await albumService.getAlbumList(req.query);

        return formatResponse.success(
            res,
            { albums: result.albums },
            "Album list fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getAlbumDetail = async (req, res, next) => {
    try {
        const album = await albumService.getAlbumDetail(req.params.id);

        return formatResponse.success(
            res,
            { album },
            "Album fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const followAlbum = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const follow = await albumService.followAlbum(userId, req.params.id);

        return formatResponse.success(
            res,
            { follow },
            "Album followed successfully"
        );
    } catch (error) {
        next(error);
    }
};

const unfollowAlbum = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const follow = await albumService.unfollowAlbum(userId, req.params.id);

        return formatResponse.success(
            res,
            { follow },
            "Album unfollowed successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getAlbumFollowStatus = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const follow = await albumService.getAlbumFollowStatus(userId, req.params.id);

        return formatResponse.success(
            res,
            { follow },
            "Album follow status fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const toggleFollowAlbum = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const result = await albumService.toggleFollowAlbum(userId, req.params.id);

        return formatResponse.success(
            res,
            { follow: result.follow },
            `Album ${result.action} successfully`
        );
    } catch (error) {
        next(error);
    }
};

const getArtistAlbums = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const albums = await albumService.getArtistAlbums(userId);

        return formatResponse.success(
            res,
            { albums },
            "Artist albums fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    followAlbum,
    getAlbumList,
    getAlbumDetail,
    getAlbumFollowStatus,
    getArtistAlbums,
    toggleFollowAlbum,
    unfollowAlbum,
};
