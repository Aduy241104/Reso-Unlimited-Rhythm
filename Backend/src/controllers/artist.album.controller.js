import artistAlbumService from "../services/artist/artist.album.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyAlbums = async (req, res, next) => {
    try {
        const result = await artistAlbumService.getMyAlbums(req.user.id, req.query);

        return formatResponse.success(
            res,
            { albums: result.albums },
            "Artist albums fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyAlbums,
};
