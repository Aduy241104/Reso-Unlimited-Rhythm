import artistProfileService from "../services/artistProfile/artistProfile.service.js";
import formatResponse from "../utils/formatResponse.js";

const getProfile = async (req, res, next) => {
    try {
        const bundle = await artistProfileService.getProfileBundle(req.user.id);

        return formatResponse.success(res, bundle, "Artist profile fetched successfully");
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const bundle = await artistProfileService.updateProfileFields(req.user.id, req.body);

        return formatResponse.success(res, bundle, "Artist profile updated successfully");
    } catch (error) {
        next(error);
    }
};

const requestVerification = async (req, res, next) => {
    try {
        const result = await artistProfileService.requestVerification(req.user.id);

        return formatResponse.success(
            res,
            { artist: result.artist, message: result.message },
            result.message
        );
    } catch (error) {
        next(error);
    }
};

const uploadAvatar = async (req, res, next) => {
    try {
        const bundle = await artistProfileService.uploadArtistImage(
            req.user.id,
            req.file?.buffer,
            "avatar"
        );

        return formatResponse.success(res, bundle, "Avatar updated successfully");
    } catch (error) {
        next(error);
    }
};

const uploadCover = async (req, res, next) => {
    try {
        const bundle = await artistProfileService.uploadArtistImage(
            req.user.id,
            req.file?.buffer,
            "cover"
        );

        return formatResponse.success(res, bundle, "Cover image updated successfully");
    } catch (error) {
        next(error);
    }
};

export default {
    getProfile,
    updateProfile,
    requestVerification,
    uploadAvatar,
    uploadCover,
};
