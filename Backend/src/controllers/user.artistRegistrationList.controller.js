import userArtistRegistrationListService from "../services/artist/user.artistRegistrationList.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyArtistRegistrationRequests = async (req, res, next) => {
    try {
        const { requests, meta } =
            await userArtistRegistrationListService.getMyArtistRegistrationRequests(
                req.user.id,
                req.query
            );

        return formatResponse.success(
            res,
            { requests },
            "Artist registration requests fetched successfully",
            meta
        );
    } catch (error) {
        next(error);
    }
};

const getMyArtistRegistrationRequestDetail = async (req, res, next) => {
    try {
        const request =
            await userArtistRegistrationListService.getMyArtistRegistrationRequestDetail(
                req.user.id,
                req.params.id
            );

        return formatResponse.success(
            res,
            { request },
            "Artist registration request detail fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const cancelArtistRegistrationRequest = async (req, res, next) => {
    try {
        const result =
            await userArtistRegistrationListService.cancelArtistRegistrationRequest(
                req.user.id,
                req.params.id
            );

        return formatResponse.success(
            res,
            result,
            "Artist registration request cancelled successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyArtistRegistrationRequests,
    getMyArtistRegistrationRequestDetail,
    cancelArtistRegistrationRequest,
};
