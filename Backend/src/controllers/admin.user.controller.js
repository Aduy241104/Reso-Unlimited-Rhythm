import userService from "../services/user/admin.user.service.js";
import formatResponse from "../utils/formatResponse.js";

const getUsers = async (req, res, next) => {
    try {
        const { users, meta } = await userService.getUsers(req.query);

        return formatResponse.success(
            res,
            { users },
            "Users fetched successfully",
            meta
        );
    } catch (error) {
        next(error);
    }
};

const getUserDetail = async (req, res, next) => {
    try {
        const user = await userService.getUserDetail(req.params.id);

        return formatResponse.success(
            res,
            { user },
            "User fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const updateUser = async (req, res, next) => {
    try {
        const user = await userService.updateUser(
            req.params.id,
            req.body
        );

        return formatResponse.success(
            res,
            { user },
            "User updated successfully"
        );
    } catch (error) {
        next(error);
    }
};

export default {
    getUsers,
    getUserDetail,
    updateUser,
};