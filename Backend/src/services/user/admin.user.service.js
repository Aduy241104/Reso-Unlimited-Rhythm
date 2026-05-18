import User from "../../models/User.js";

const getUsers = async (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 20);
    const q = (query.q || "").trim();

    const filter = {};

    if (q) {
        const regex = new RegExp(q, "i");
        filter.$or = [
            { email: regex },
            { "profile.fullName": regex },
        ];
    }

    if (query.role) {
        filter.role = query.role;
    }

    if (query.activeStatus) {
        filter.activeStatus = query.activeStatus;
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

    return { users, meta };
};

const getUserDetail = async (id) => {
    const user = await User.findById(id).select("-password");
    return user;
};

const updateUser = async (id, body) => {
    const updates = {};

    if (body.role) {
        updates.role = body.role;
    }

    if (typeof body.activeStatus !== "undefined") {
        updates.activeStatus = body.activeStatus;
    }

    if (body.fullName) {
        updates["profile.fullName"] = body.fullName;
    }

    const user = await User.findByIdAndUpdate(id, updates, {
        new: true,
    }).select("-password");

    return user;
};

export default {
    getUsers,
    getUserDetail,
    updateUser,
};