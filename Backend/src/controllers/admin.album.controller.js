import adminAlbumService from "../services/album/admin.album.service.js";
import formatResponse from "../utils/formatResponse.js";

const listAlbumsForAdmin = async (req, res, next) => {
    try {
        const result = await adminAlbumService.listAlbumsForAdmin(req.query);

        return formatResponse.success(
            res,
            { albums: result.albums },
            "Albums fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getAlbumDetailForAdmin = async (req, res, next) => {
    try {
        const album = await adminAlbumService.getAlbumDetailForAdmin(req.params.id);

        return formatResponse.success(
            res,
            { album },
            "Album detail fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateAlbumStatusForAdmin = async (req, res, next) => {
    try {
        const album = await adminAlbumService.updateAlbumStatusForAdmin(
            req.params.id,
            req.body,
            req.user?.id || req.user?._id,
            req.app.get("io")
        );

        return formatResponse.success(
            res,
            { album },
            req.body.action === "block"
                ? "Album blocked successfully"
                : "Album unblocked successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    listAlbumsForAdmin,
    getAlbumDetailForAdmin,
    updateAlbumStatusForAdmin,
};
