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

const getTrackDetailForAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const trackDetail = await adminTrackService.getTrackDetailForAdmin(id);

        return formatResponse.success(
            res,
            { track: trackDetail },
            "Track detail fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateTrackApprovalStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, rejectReason } = req.body;

        const updatedTrack = await adminTrackService.updateTrackApprovalStatus(id, {
            status,
            rejectReason,
        });

        return formatResponse.success(
            res,
            { track: updatedTrack },
            "Track approval status updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateTrackVisibilityController = async (req, res, next) => {
    try {
        const track = await adminTrackService.updateTrackVisibility(
            req.params.id,
            req.body
        );

        res.json(track);
    } catch (error) {
        next(error);
    }
};

export default {
    listTracksForAdmin,
    updateTrackApprovalStatus,
    updateTrackVisibilityController,
    getTrackDetailForAdmin,
};
