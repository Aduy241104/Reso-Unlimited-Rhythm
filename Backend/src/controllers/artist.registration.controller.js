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

export default {
    requestArtistRegistration,
};
