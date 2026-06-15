import mongoose from "mongoose";
import Report from "../../models/Report.js";

const VALID_STATUSES = ["pending", "reviewing", "resolved", "rejected"];
const VALID_RESOLUTIONS = ["remove_content", "ignore", "warning", ""];

const getReports = async (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    if (query.status) {
        filter.status = query.status;
    }

    if (query.targetType) {
        filter.targetType = query.targetType;
    }

    if (query.q) {
        const regex = new RegExp(query.q, "i");
        filter.$or = [
            { "userId": regex },
            { "targetId": regex },
            { "reason": regex },
            { "description": regex },
        ];
    }

    const [reports, total] = await Promise.all([
        Report.find(filter)
            .populate("userId", "email profile.fullName")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Report.countDocuments(filter),
    ]);

    const meta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };

    return { reports, meta };
};

const getReportDetail = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid report ID");
    }

    const report = await Report.findById(id)
        .populate("userId", "email profile.fullName")
        .populate("handledBy", "email profile.fullName")
        .lean();

    if (!report) {
        throw new Error("Report not found");
    }

    return report;
};

const updateReportStatus = async (id, body, adminId) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid report ID");
    }

    const { status, resolution, resolutionNote } = body;

    const updates = {
        handledBy: adminId,
        handledAt: new Date(),
    };

    if (status && VALID_STATUSES.includes(status)) {
        updates.status = status;
    }

    if (resolution !== undefined && VALID_RESOLUTIONS.includes(resolution)) {
        updates.resolution = resolution;
    }

    if (typeof resolutionNote === "string") {
        updates.resolutionNote = resolutionNote.slice(0, 500);
    }

    const report = await Report.findByIdAndUpdate(id, updates, { new: true })
        .populate("userId", "email profile.fullName")
        .populate("handledBy", "email profile.fullName")
        .lean();

    if (!report) {
        throw new Error("Report not found");
    }

    return report;
};

export default {
    getReports,
    getReportDetail,
    updateReportStatus,
};
