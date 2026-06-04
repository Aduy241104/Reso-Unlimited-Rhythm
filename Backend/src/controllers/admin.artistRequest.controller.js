import adminArtistRequestService from "../services/artist/admin.artistRequest.service.js";
import formatResponse from "../utils/formatResponse.js";

const getArtistRequests = async (req, res, next) => {
    try {
        const { artistRequests, meta } =
            await adminArtistRequestService.getArtistRequests(req.query);

        return formatResponse.success(
            res,
            { artistRequests },
            "Artist requests fetched successfully",
            meta
        );
    } catch (error) {
        next(error);
    }
};

const getArtistRequestDetail = async (req, res, next) => {
    try {
        const artistRequest = await adminArtistRequestService.getArtistRequestDetail(
            req.params.id
        );

        return formatResponse.success(
            res,
            { artistRequest },
            "Artist request fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const reviewArtistRequest = async (req, res, next) => {
    try {
        const result = await adminArtistRequestService.reviewArtistRequest(
            req.params.id,
            req.body,
            req.user.id
        );

        return formatResponse.success(
            res,
            {
                artistRequest: result.artistRequest,
                artist: result.artist,
            },
            req.body.status === "approved"
                ? "Artist request approved successfully"
                : "Artist request rejected successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getArtistRequests,
    getArtistRequestDetail,
    reviewArtistRequest,
};
