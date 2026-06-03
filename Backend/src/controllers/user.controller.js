import userService from "../services/user/user.service.js";
import formatResponse from "../utils/formatResponse.js";

const getMyProfile = async (req, res, next) => {
    try {
        const user = await userService.getMyProfileByUserId(req.user.id);

        return formatResponse.success(
            res,
            { user },
            "Current user fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateMyProfile = async (req, res, next) => {
    try {
        const user = await userService.updateMyProfileByUserId(
            req.user.id,
            req.body,
            req.file
        );

        return formatResponse.success(
            res,
            { user },
            "Profile updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

const changeMyPassword = async (req, res, next) => {
    try {
        await userService.changeMyPasswordByUserId(
            req.user?.id || req.user?._id,
            req.body
        );

        return formatResponse.success(
            res,
            null,
            "Password changed successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getMyProfile,
    updateMyProfile,
    changeMyPassword,
};
