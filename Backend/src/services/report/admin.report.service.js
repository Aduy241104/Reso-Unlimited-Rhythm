import mongoose from "mongoose";
import Report from "../../models/Report.js";
import Track from "../../models/Track.js";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import Notification from "../../models/Notification.js";
import { AppError } from "../../utils/AppError.js";
import { syncArtistContentVisibility } from "../artist/admin.artist.service.js";

const VALID_STATUSES = ["pending", "reviewing", "resolved", "rejected"];

const normalizeResolutionAction = (action) => {
    const normalizedAction = String(action || "").trim().toLowerCase();

    if (["reject", "rejected"].includes(normalizedAction)) {
        return "reject";
    }

    if (["block", "block_artist"].includes(normalizedAction)) {
        return "block_artist";
    }

    if (["hide", "hide_content", "hide7"].includes(normalizedAction)) {
        return "hide_content";
    }

    return "warning";
};

// Helper to populate target item info (Track, Album, or Artist)
const populateTargetInfo = async (targetType, targetId) => {
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) return null;

    try {
        let targetInfo = null;

        switch (targetType) {
            case "track":
                targetInfo = await Track.findById(targetId)
                    .select("title artist_artistId avatar activeStatus approvalStatus")
                    .populate("artist_artistId", "userId name avatar activeStatus violations")
                    .lean();
                break;
            case "album":
                targetInfo = await Album.findById(targetId)
                    .select("title artistId coverImage status")
                    .populate("artistId", "userId name avatar activeStatus violations")
                    .lean();
                break;
            case "artist":
                targetInfo = await Artist.findById(targetId)
                    .select("userId name avatar activeStatus violations")
                    .lean();
                break;
        }

        return targetInfo;
    } catch (error) {
        console.error("Error populating target info:", error);
        return null;
    }
};

// 1. GET GROUPED REPORTS LIST
const getGroupedReports = async (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;

    const matchFilter = {};

    if (query.targetType) {
        matchFilter.targetType = query.targetType;
    }

    if (query.status) {
        matchFilter.status = query.status;
    }

    const aggregationPipeline = [
        { $match: matchFilter },
        {
            $group: {
                _id: {
                    targetType: "$targetType",
                    targetId: "$targetId",
                },
                totalReports: { $sum: 1 },
                pendingReports: {
                    $sum: {
                        $cond: [{ $in: ["$status", ["pending", "reviewing"]] }, 1, 0],
                    },
                },
                resolvedReports: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "resolved"] }, 1, 0],
                    },
                },
                rejectedReports: {
                    $sum: {
                        $cond: [{ $eq: ["$status", "rejected"] }, 1, 0],
                    },
                },
                reasons: { $push: "$reason" },
                latestReportAt: { $max: "$createdAt" },
                reportIds: { $push: "$_id" },
            },
        },
        { $sort: { latestReportAt: -1, "_id.targetId": 1 } },
    ];

    const allGroups = await Report.aggregate(aggregationPipeline);

    let groupsWithDetails = await Promise.all(
        allGroups.map(async (group) => {
            const { targetType, targetId } = group._id;
            const targetInfo = await populateTargetInfo(targetType, targetId);

            const reasonCounts = {};
            (group.reasons || []).forEach((r) => {
                if (r) {
                    reasonCounts[r] = (reasonCounts[r] || 0) + 1;
                }
            });

            let groupStatus = "resolved";
            if (group.pendingReports > 0) {
                groupStatus = "pending";
            } else if (group.resolvedReports === 0 && group.rejectedReports > 0) {
                groupStatus = "rejected";
            }

            const latestReport = await Report.findOne({
                targetType,
                targetId,
            }).sort({ createdAt: -1, _id: -1 }).lean();

            return {
                targetType,
                targetId,
                totalReports: group.totalReports,
                pendingReports: group.pendingReports,
                resolvedReports: group.resolvedReports,
                rejectedReports: group.rejectedReports,
                reasonCounts,
                latestReportAt: group.latestReportAt,
                groupStatus,
                latestReport,
                targetInfo,
            };
        })
    );

    const isOnlyViolations = query.onlyViolations === "true" || query.onlyViolations === true;
    if (isOnlyViolations) {
        // Group all report details by Artist ID
        const artistGroupsMap = new Map();

        for (const g of groupsWithDetails) {
            let artistId = null;
            let artistObj = null;

            if (g.targetType === "artist") {
                artistObj = g.targetInfo;
                artistId = g.targetId;
            } else if (g.targetType === "track" && g.targetInfo?.artist_artistId) {
                artistObj = g.targetInfo.artist_artistId;
                artistId = artistObj?._id || artistObj;
            } else if (g.targetType === "album" && g.targetInfo?.artistId) {
                artistObj = g.targetInfo.artistId;
                artistId = artistObj?._id || artistObj;
            }

            if (!artistId) continue;
            const artistIdStr = String(artistId);

            if (!artistGroupsMap.has(artistIdStr)) {
                let artistDoc = artistObj;
                if (!artistDoc?.violations || !artistDoc?.name) {
                    artistDoc = await Artist.findById(artistIdStr).select("userId name avatar activeStatus violations").lean();
                }

                artistGroupsMap.set(artistIdStr, {
                    targetType: "artist",
                    targetId: artistIdStr,
                    targetInfo: artistDoc || { _id: artistIdStr, name: "Nghệ sĩ", activeStatus: "active", violations: [] },
                    violationsCount: artistDoc?.violations?.length || 0,
                    totalReports: 0,
                    pendingReports: 0,
                    resolvedReports: 0,
                    rejectedReports: 0,
                    latestReport: g.latestReport,
                    latestReportAt: g.latestReportAt,
                    groupStatus: g.groupStatus,
                });
            }

            const item = artistGroupsMap.get(artistIdStr);
            item.totalReports += g.totalReports || 1;
            item.pendingReports += g.pendingReports || 0;
            item.resolvedReports += g.resolvedReports || 0;
            item.rejectedReports += g.rejectedReports || 0;

            const newTime = new Date(g.latestReportAt || 0).getTime();
            const existingTime = new Date(item.latestReportAt || 0).getTime();
            if (newTime > existingTime) {
                item.latestReportAt = g.latestReportAt;
                item.latestReport = g.latestReport;
                item.groupStatus = g.groupStatus;
            } else if (newTime === existingTime && g.latestReport?._id) {
                if (String(g.latestReport._id) > String(item.latestReport?._id || "")) {
                    item.latestReport = g.latestReport;
                    item.groupStatus = g.groupStatus;
                }
            }
        }

        groupsWithDetails = Array.from(artistGroupsMap.values()).filter((g) => {
            const vCount = g.violationsCount || (Array.isArray(g.targetInfo?.violations) ? g.targetInfo.violations.length : 0);
            const isBlocked = g.targetInfo?.activeStatus === "blocked";
            return vCount >= 1 || isBlocked;
        });

        groupsWithDetails.sort((a, b) => {
            const timeA = new Date(a.latestReportAt || 0).getTime();
            const timeB = new Date(b.latestReportAt || 0).getTime();
            if (timeB !== timeA) return timeB - timeA;
            const nameA = String(a.targetInfo?.name || "");
            const nameB = String(b.targetInfo?.name || "");
            return nameA.localeCompare(nameB);
        });
    }

    if (query.search && typeof query.search === "string" && query.search.trim() !== "") {
        const q = query.search.trim().toLowerCase();
        groupsWithDetails = groupsWithDetails.filter((g) => {
            const name = (g.targetInfo?.name || "").toLowerCase();
            const title = (g.targetInfo?.title || "").toLowerCase();
            const artistName = (g.targetInfo?.artist_artistId?.name || g.targetInfo?.artistId?.name || "").toLowerCase();
            const desc = (g.latestReport?.description || "").toLowerCase();
            const targetIdStr = String(g.targetId || "").toLowerCase();

            return (
                name.includes(q) ||
                title.includes(q) ||
                artistName.includes(q) ||
                desc.includes(q) ||
                targetIdStr.includes(q)
            );
        });
    }

    const total = groupsWithDetails.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedGroups = groupsWithDetails.slice(skip, skip + limit);

    const meta = {
        page,
        limit,
        total,
        totalPages,
    };

    return { groups: paginatedGroups, meta };
};

// 2. GET GROUPED REPORT DETAIL
const getGroupedReportDetail = async (targetType, targetId) => {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
        throw new Error("ID nội dung bị báo cáo không hợp lệ");
    }

    let reports = [];

    if (targetType === "artist") {
        const trackIds = (await Track.find({ artist_artistId: targetId }).select("_id").lean()).map((t) => t._id);
        const albumIds = (await Album.find({ artistId: targetId }).select("_id").lean()).map((a) => a._id);

        reports = await Report.find({
            $or: [
                { targetType: "artist", targetId },
                { targetType: "track", targetId: { $in: trackIds } },
                { targetType: "album", targetId: { $in: albumIds } },
            ],
        })
            .populate("userId", "email profile.fullName avatar")
            .populate("handledBy", "email profile.fullName")
            .sort({ createdAt: -1 })
            .lean();
    } else {
        reports = await Report.find({ targetType, targetId })
            .populate("userId", "email profile.fullName avatar")
            .populate("handledBy", "email profile.fullName")
            .sort({ createdAt: -1 })
            .lean();
    }

    reports = await Promise.all(
        reports.map(async (r) => {
            const itemInfo = await populateTargetInfo(r.targetType, r.targetId);
            return {
                ...r,
                targetInfo: itemInfo,
            };
        })
    );

    const targetInfo = await populateTargetInfo(targetType, targetId);

    let artistObj = null;
    if (targetType === "track" && targetInfo?.artist_artistId) {
        artistObj = targetInfo.artist_artistId;
    } else if (targetType === "album" && targetInfo?.artistId) {
        artistObj = targetInfo.artistId;
    } else if (targetType === "artist") {
        artistObj = targetInfo;
    }

    const artistId = artistObj?._id || artistObj?.id || (targetType === "artist" ? targetId : null);
    let artistViolationsCount = 0;
    let artistActiveStatus = "active";
    let artistViolationsList = [];

    if (artistId) {
        const artist = await Artist.findById(artistId).select("violations activeStatus").lean();
        if (artist) {
            artistViolationsCount = artist.violations?.length || 0;
            artistActiveStatus = artist.activeStatus || "active";
            artistViolationsList = artist.violations || [];
        }
    }

    const pendingCount = reports.filter((r) => r.status === "pending" || r.status === "reviewing").length;
    const resolvedCount = reports.filter((r) => r.status === "resolved").length;
    const rejectedCount = reports.filter((r) => r.status === "rejected").length;

    let groupStatus = "resolved";
    if (pendingCount > 0) groupStatus = "pending";
    else if (resolvedCount === 0 && rejectedCount > 0) groupStatus = "rejected";

    return {
        targetType,
        targetId,
        targetInfo,
        artistInfo: artistObj,
        artistViolationsCount,
        artistActiveStatus,
        artistViolationsList,
        totalReports: reports.length,
        pendingCount,
        resolvedCount,
        rejectedCount,
        groupStatus,
        reports,
    };
};

// 3. RESOLVE GROUPED REPORT & APPLY PENALTY
const resolveGroupedReport = async (targetType, targetId, body, adminId) => {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
        throw new Error("ID nội dung bị báo cáo không hợp lệ");
    }

    const { evaluations = [], action = "warn", resolutionNote = "" } = body;
    const normalizedAction = normalizeResolutionAction(action);

    const targetInfo = await populateTargetInfo(targetType, targetId);
    let artistId = null;

    if (targetType === "track" && targetInfo?.artist_artistId) {
        artistId = targetInfo.artist_artistId._id || targetInfo.artist_artistId;
    } else if (targetType === "album" && targetInfo?.artistId) {
        artistId = targetInfo.artistId._id || targetInfo.artistId;
    } else if (targetType === "artist") {
        artistId = targetId;
    }

    const evaluationMap = new Map();
    evaluations.forEach((e) => {
        if (e.reportId) evaluationMap.set(String(e.reportId), Boolean(e.isValid));
    });

    const groupReports = await Report.find({ targetType, targetId });

    const pendingGroupReports = groupReports.filter(
        (r) => r.status === "pending" || r.status === "reviewing"
    );

    if (groupReports.length > 0 && pendingGroupReports.length === 0) {
        throw new AppError("Không có báo cáo mới nào đang chờ duyệt. Đợt báo cáo này đã được xử lý hoàn tất.", 400);
    }

    const handledAt = new Date();
    const resolutionBatchId = new mongoose.Types.ObjectId().toString();

    for (const report of pendingGroupReports) {
        const isValid = evaluationMap.has(String(report._id))
            ? evaluationMap.get(String(report._id))
            : false;

        report.isValidReason = isValid;
        report.handledBy = adminId;
        report.handledAt = handledAt;
        report.resolutionBatchId = resolutionBatchId;
        report.resolutionNote = resolutionNote;

        if (normalizedAction === "reject") {
            report.status = "rejected";
            report.resolution = "reject";
        } else {
            report.status = "resolved";
            report.resolution = normalizedAction;
        }

        await report.save();
    }

    const hasValidViolationReport =
        normalizedAction !== "reject" &&
        pendingGroupReports.some((report) => evaluationMap.get(String(report._id)) === true);
    const shouldIncrementViolation = hasValidViolationReport;

    let updatedViolationsCount = 0;
    let newArtistStatus = "active";
    let penaltyAppliedMessage = normalizedAction === "reject" ? "Đã từ chối báo cáo. Không tăng số lần vi phạm." : "";

    if (shouldIncrementViolation && artistId && mongoose.Types.ObjectId.isValid(artistId)) {
        const artist = await Artist.findById(artistId);
        if (artist) {
            const targetTitle = targetInfo?.title || targetInfo?.name || targetType;
            const targetTypeName = targetType === "track" ? "bài hát" : targetType === "album" ? "album" : "hồ sơ nghệ sĩ";
            artist.violations.push({
                content: `Báo cáo vi phạm đối với ${targetTypeName} "${targetTitle}"`,
                violatedAt: new Date(),
            });

            updatedViolationsCount = artist.violations.length;

            const REASON_MAP = {
                copyright_infringement: "Vi phạm bản quyền",
                harassment_or_hate: "Quấy rối / Thù địch",
                nudity_or_sexual_content: "Nội dung đồi trụy",
                violence_or_dangerous_content: "Bạo lực / Nguy hiểm",
                spam_or_scam: "Spam / Lừa đảo",
                misleading_information: "Thông tin sai lệch",
                impersonation: "Mạo danh",
                other: "Vi phạm quy định",
            };

            REASON_MAP.fake_artist = "Nghệ sĩ giả mạo";
            REASON_MAP.wrong_metadata = "Thông tin bài hát không chính xác";
            REASON_MAP.lyrics_issue = "Lời bài hát không phù hợp";
            REASON_MAP.audio_quality = "Chất lượng âm thanh kém";

            const validReasons = evaluations
                .filter((e) => e.isValid)
                .map((e) => {
                    const found = pendingGroupReports.find((r) => String(r._id) === String(e.reportId));
                    return found?.reason;
                })
                .filter(Boolean);

            const reasonSummary = Array.from(new Set(validReasons))
                .map((r) => REASON_MAP[r] || r)
                .join(", ");

            let extraInfo = "";
            if (reasonSummary) {
                extraInfo += `\n- Lý do vi phạm xác nhận: ${reasonSummary}`;
            }
            if (resolutionNote && resolutionNote.trim()) {
                extraInfo += `\n- Ghi chú từ Quản trị viên: "${resolutionNote.trim()}"`;
            }

            let notifTitle = "";
            let notifContent = "";

            if (updatedViolationsCount === 1) {
                penaltyAppliedMessage = "Gửi cảnh báo vi phạm (Lần 1) tới nghệ sĩ.";
                notifTitle = "Cảnh báo vi phạm nội dung (Lần 1)";
                notifContent = `Nội dung [${targetTitle}] của bạn đã bị báo cáo vi phạm hợp lệ.${extraInfo}\n\nĐây là cảnh báo lần 1. Vui lòng rà soát và tuân thủ quy định hệ thống.`;
            } else if (updatedViolationsCount === 2) {
                penaltyAppliedMessage = "Đã tích lũy 2 lần vi phạm: Gửi cảnh báo mức cao hơn (Lần 2) tới nghệ sĩ.";
                notifTitle = "Cảnh báo vi phạm mức độ cao (Lần 2)";
                notifContent = `Nội dung [${targetTitle}] tiếp tục bị xác nhận vi phạm.${extraInfo}\n\nĐây là cảnh báo mức độ cao lần 2. Vui lòng kiểm tra lại nội dung.`;
            } else if (updatedViolationsCount === 3) {
                penaltyAppliedMessage = "Đã tích lũy 3 lần vi phạm: Gửi cảnh báo mức nghiêm trọng (Lần 3) tới nghệ sĩ.";
                notifTitle = "Cảnh báo vi phạm nghiêm trọng (Lần 3)";
                notifContent = `Nội dung [${targetTitle}] tiếp tục bị xác nhận vi phạm.${extraInfo}\n\nĐây là cảnh báo nghiêm trọng lần 3. Nếu vi phạm lần thứ 4, toàn bộ bài nhạc, album và podcast của nghệ sĩ sẽ bị khóa.`;
            } else if (updatedViolationsCount === 4) {
                penaltyAppliedMessage = "Đã tích lũy 4 lần vi phạm: tự động khóa toàn bộ bài nhạc, album và podcast của nghệ sĩ.";
                notifTitle = "Thông báo khóa toàn bộ nội dung (Lần 4)";
                notifContent = `Tài khoản của bạn đã tích lũy 4 lần vi phạm. Toàn bộ bài nhạc, album và podcast của bạn đã bị khóa trên hệ thống.${extraInfo}`;

                await syncArtistContentVisibility(
                    artist._id,
                    "blocked",
                    resolutionNote || "Toàn bộ nội dung bị khóa sau lần vi phạm thứ 4."
                );
            } else if (updatedViolationsCount >= 5) {
                penaltyAppliedMessage = `Đã tích lũy ${updatedViolationsCount} lần vi phạm: Khóa tài khoản nghệ sĩ.`;
                notifTitle = "Thông báo khóa tài khoản nghệ sĩ (Lần 5)";
                notifContent = `Tài khoản nghệ sĩ của bạn đã tích lũy ${updatedViolationsCount} lần vi phạm nội dung và đã bị KHÓA TÀI KHOẢN.${extraInfo}`;

                artist.activeStatus = "blocked";
                newArtistStatus = "blocked";
            }

            if (normalizedAction === "block_artist") {
                artist.activeStatus = "blocked";
                newArtistStatus = "blocked";
                penaltyAppliedMessage = "Quản trị viên đã khóa tài khoản nghệ sĩ thủ công.";
                notifTitle = "Thông báo khóa tài khoản nghệ sĩ";
                notifContent = `Tài khoản nghệ sĩ của bạn đã bị KHÓA bởi Quản trị viên.${extraInfo}`;
            }

            if (newArtistStatus === "blocked") {
                await syncArtistContentVisibility(
                    artist._id,
                    "blocked",
                    resolutionNote || "Artist blocked after report review."
                );
            }

            await artist.save();

            if (artist.userId) {
                await Notification.create({
                    userId: artist.userId,
                    type: "system",
                    title: notifTitle,
                    content: notifContent,
                    actorId: adminId || null,
                    actorType: "admin",
                    targetId,
                    targetType,
                    targetName: targetTitle,
                    receiverType: "single",
                    sourceType: "admin_manual",
                    createdBy: adminId || null,
                });
            }
        }
    }

    return {
        success: true,
        message: penaltyAppliedMessage || "Đã xử lý vi phạm thành công.",
        updatedViolationsCount,
        artistActiveStatus: newArtistStatus,
        penaltyAppliedMessage,
    };
};

const getReports = async (query) => {
    return await getGroupedReports(query);
};

const getReportDetail = async (id) => {
    if (mongoose.Types.ObjectId.isValid(id)) {
        const report = await Report.findById(id).lean();
        if (report) {
            return await getGroupedReportDetail(report.targetType, String(report.targetId));
        }
    }
    throw new Error("Không tìm thấy báo cáo");
};

const updateReportStatus = async (id, body, adminId) => {
    const report = await Report.findById(id).lean();
    if (!report) throw new Error("Report not found");
    const action = body.status === "rejected" ? "reject" : "warn";
    return await resolveGroupedReport(report.targetType, String(report.targetId), { action, ...body }, adminId);
};

export default {
    getGroupedReports,
    getGroupedReportDetail,
    resolveGroupedReport,
    getReports,
    getReportDetail,
    updateReportStatus,
};
