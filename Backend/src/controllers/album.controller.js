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

export default {
    getAlbumList,
    getAlbumDetail,
};
