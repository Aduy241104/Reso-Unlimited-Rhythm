import User from "../../models/User.js";
import { AppError } from "../../utils/AppError.js";
import userServiceHelper from "./user.service.helper.js";

const getMyProfileByUserId = async (userId) => {
    const user = await User.findById(userId)
        .select("-password -__v")
        .lean();

    if (!user) {
        throw new AppError("User does not exist.", 404);
    }

    return userServiceHelper.formatCurrentUserProfile(user);
};

export default {
    getMyProfileByUserId,
};
