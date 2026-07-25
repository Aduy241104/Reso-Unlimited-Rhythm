import artistService from "../services/artist/artist.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyProfile = async (req, res, next) => {
    try {
        const artist = await artistService.getMyProfileByUserId(req.user.id);

        return formatResponse.success(
            res,
            { artist },
            "Artist profile fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const getMyBlockStatus = async (req, res, next) => {
    try {
        const blockStatus = await artistService.getMyBlockStatusByUserId(req.user.id);

        return formatResponse.success(
            res,
            { blockStatus },
            "Artist block status fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateMyProfile = async (req, res, next) => {
    try {
        const artist = await artistService.updateMyProfileByUserId(req.user.id, req.body);

        return formatResponse.success(
            res,
            { artist },
            "Artist profile updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateMyProfileMedia = async (req, res, next) => {
    try {
        const avatarFile = req.files?.avatar?.[0];
        const coverFile = req.files?.coverImage?.[0];

        const artist = await artistService.updateMyProfileMediaByUserId(req.user.id, {
            avatarFile,
            coverFile,
        });

        return formatResponse.success(
            res,
            { artist },
            "Artist profile media updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const requestVerification = async (req, res, next) => {
    try {
        const artist = await artistService.requestVerificationByUserId(req.user.id, req.body);

        return formatResponse.success(
            res,
            { artist },
            "Verification request submitted successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyProfile,
    getMyBlockStatus,
    updateMyProfile,
    updateMyProfileMedia,
    requestVerification,
};
