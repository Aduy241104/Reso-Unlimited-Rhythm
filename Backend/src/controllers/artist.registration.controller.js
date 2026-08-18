import artistRegistrationService from "../services/artist/artist.registration.service.js";
import formatResponse from "../utils/formatResponse.js";

const requestArtistRegistration = async (req, res, next) => {
    try {
        const artistRequest =
            await artistRegistrationService.createArtistRegistrationRequestByUserId(
                req.user.id,
                req.body,
                req.files ?? {}
            );

        return formatResponse.success(
            res,
            { artistRequest },
            "Artist registration request submitted successfully"
        );
    } catch (error) {
        next(error);
    }
};

const checkArtistStageNameAvailability = async (req, res, next) => {
    try {
        const result =
            await artistRegistrationService.checkStageNameAvailabilityByUserId(
                req.user.id,
                req.query.stageName
            );

        return formatResponse.success(
            res,
            result,
            result.message
        );
    } catch (error) {
        next(error);
    }
};

const checkArtistIdNumberAvailability = async (req, res, next) => {
    try {
        const result =
            await artistRegistrationService.checkIdNumberAvailabilityByUserId(
                req.user.id,
                req.query.idNumber
            );

        return formatResponse.success(
            res,
            result,
            result.message
        );
    } catch (error) {
        next(error);
    }
};

export default {
    requestArtistRegistration,
    checkArtistStageNameAvailability,
    checkArtistIdNumberAvailability,
};
