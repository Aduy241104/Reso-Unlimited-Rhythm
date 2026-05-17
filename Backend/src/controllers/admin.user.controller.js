import User from "../models/User.js";
import formatResponse from "../utils/formatResponse.js";

const getUsers = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 20);
        const q = (req.query.q || "").trim();

        const filter = {};
        if (q) {
            const regex = new RegExp(q, "i");
            filter.$or = [{ email: regex }, { "profile.fullName": regex }];
        }

        const total = await User.countDocuments(filter);
        const users = await User.find(filter)
            .select("-password")
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        const meta = {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        };

        return formatResponse.success(res, { users }, "Users fetched successfully", meta);
    } catch (error) {
        next(error);
    }
};

// The following handlers are intentionally disabled so only the users-list and detail features are available.
const getUserDetail = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        return formatResponse.success(res, { user }, "User fetched successfully");
    } catch (error) {
        next(error);
    }
};

/*
const updateUser = async (req, res, next) => {
    try {
        const updates = {};
            if (req.body.role) updates.role = req.body.role;
            if (typeof req.body.activeStatus !== "undefined") updates.activeStatus = req.body.activeStatus;
            if (req.body.fullName) updates["profile.fullName"] = req.body.fullName;

        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password -refreshTokens");

        return formatResponse.success(res, { user }, "User updated successfully");
    } catch (error) {
        next(error);
    }
};

const deleteUser = async (req, res, next) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        return formatResponse.success(res, { deleted: true }, "User deleted successfully");
    } catch (error) {
        next(error);
    }
};
*/

export default {
    getUsers,
    getUserDetail,
};
