import mongoose from "mongoose";
import Report from "../../models/Report.js";
import Track from "../../models/Track.js";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";

const VALID_STATUSES = ["reviewing", "resolved", "rejected"];

const populateTargetInfo = async (report) => {
    if (!report.targetId) return report;

    try {
        let targetInfo = null;

        switch (report.targetType) {
            case "track":
                targetInfo = await Track.findById(report.targetId)
                    .select("title artist_artistId avatar")
                    .populate("artist_artistId", "name avatar")
                    .lean();
                break;
            case "album":
                targetInfo = await Album.findById(report.targetId)
                    .select("title artistId coverImage")
                    .populate("artistId", "name avatar")
                    .lean();
                break;
            case "artist":
                targetInfo = await Artist.findById(report.targetId)
                    .select("name avatar")
                    .lean();
                break;
        }

        return {
            ...report,
            targetInfo: targetInfo || null,
        };
    } catch (error) {
        console.error("Error populating target info:", error);
        return report;
    }
};

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

    const reportsWithTargets = await Promise.all(
        reports.map(report => populateTargetInfo(report))
    );

    const meta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };

    return { reports: reportsWithTargets, meta };
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

    return await populateTargetInfo(report);
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

    if (typeof resolution === "string" && resolution.trim() !== "") {
        updates.resolution = resolution.trim();
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

    return await populateTargetInfo(report);
};

export default {
    getReports,
    getReportDetail,
    updateReportStatus,
};
