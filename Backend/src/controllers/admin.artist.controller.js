import adminArtistService from "../services/artist/admin.artist.service.js";
import adminArtistValidation from "../middlewares/Admin/admin.artist.validation.js";
import formatResponse from "../utils/formatResponse.js";
import { AppError } from "../utils/AppError.js";

const listArtistsForAdmin = async (req, res, next) => {
    try {
        const { error, value } = adminArtistValidation.listArtistsQuerySchema.validate(
            req.query,
            { abortEarly: false, stripUnknown: true }
        );

        if (error) {
            throw new AppError(
                "Invalid request data.",
                400,
                error.details.map((detail) => ({
                    field: detail.path.join("."),
                    message: detail.message,
                }))
            );
        }

        const result = await adminArtistService.listArtistsForAdmin(value);

        return formatResponse.success(
            res,
            { artists: result.artists },
            "Artists fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

const getArtistDetailForAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const artistDetail = await adminArtistService.getArtistDetailForAdmin(id);

        return formatResponse.success(
            res,
            { artist: artistDetail },
            "Artist detail fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateArtistStatusForAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { activeStatus, blockedReason } = req.body;

        const updatedArtist = await adminArtistService.updateArtistStatusForAdmin(id, {
            activeStatus,
            blockedReason
        });

        const statusMessage = activeStatus === "blocked" 
            ? "Artist account blocked successfully" 
            : "Artist account restored successfully";

        return formatResponse.success(
            res,
            { artist: updatedArtist },
            statusMessage
        );
    } catch (error) {
        next(error);
    }
};


export default {
    listArtistsForAdmin,
    getArtistDetailForAdmin,
    updateArtistStatusForAdmin,
};