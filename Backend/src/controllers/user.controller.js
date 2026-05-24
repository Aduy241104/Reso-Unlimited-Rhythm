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

export default {
    getMyProfile,
};
