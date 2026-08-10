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
            req.body,
            req.user?.id
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

const restoreUser = async (req, res, next) => {
    try {
        const user = await userService.restoreUser(req.params.id);
        return formatResponse.success(res, { user }, "User restored successfully");
    } catch (error) {
        next(error);
    }
};

const getUserModerationAudit = async (req, res, next) => {
    try {
        const auditLogs = await userService.getUserModerationAudit(req.params.id);
        return formatResponse.success(
            res,
            { auditLogs },
            "User moderation audit fetched successfully"
        );
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        const result = await userService.softDeleteUserForAdmin(req.params.id, req.user?.id);
        return formatResponse.success(res, result, "User deleted successfully");
    } catch (error) {
        next(error);
    }
};

export default {
    getUsers,
    getUserDetail,
    getUserModerationAudit,
    updateUser,
    restoreUser,
    deleteUser,
};
