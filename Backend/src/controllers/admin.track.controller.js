import adminTrackService from "../services/Track/admin.track.service.js";
import adminTrackValidation from "../middlewares/Admin/admin.track.validation.js";
import formatResponse from "../utils/formatResponse.js";
import { AppError } from "../utils/AppError.js";

const listTracksForAdmin = async (req, res, next) => {
    try {
        const { error, value } = adminTrackValidation.listTracksQuerySchema.validate(
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

        const result = await adminTrackService.listTracksForAdmin(value);

        return formatResponse.success(
            res,
            { tracks: result.tracks },
            "Tracks fetched successfully",
            result.pagination
        );
    } catch (error) {
        next(error);
    }
};

export default {
    listTracksForAdmin,
};
