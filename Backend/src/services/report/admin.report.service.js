import mongoose from "mongoose";
import Report from "../../models/Report.js";
import Track from "../../models/Track.js";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import Notification from "../../models/Notification.js";

const VALID_STATUSES = ["pending", "reviewing", "resolved", "rejected"];

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
        { $sort: { latestReportAt: -1 } },
    ];

    const allGroups = await Report.aggregate(aggregationPipeline);

    const total = allGroups.length;
    const paginatedGroups = allGroups.slice(skip, skip + limit);

    const groupsWithDetails = await Promise.all(
        paginatedGroups.map(async (group) => {
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
                targetInfo,
            };
        })
    );

    const meta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };

    return { groups: groupsWithDetails, meta };
};

// 2. GET GROUPED REPORT DETAIL
const getGroupedReportDetail = async (targetType, targetId) => {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
        throw new Error("ID nội dung bị báo cáo không hợp lệ");
    }

    const reports = await Report.find({ targetType, targetId })
        .populate("userId", "email profile.fullName avatar")
        .populate("handledBy", "email profile.fullName")
        .sort({ createdAt: -1 })
        .lean();

    if (!reports || reports.length === 0) {
        throw new Error("Không tìm thấy báo cáo nào cho nội dung này");
    }

    const targetInfo = await populateTargetInfo(targetType, targetId);

    let artistObj = null;
    if (targetType === "track" && targetInfo?.artist_artistId) {
        artistObj = targetInfo.artist_artistId;
    } else if (targetType === "album" && targetInfo?.artistId) {
        artistObj = targetInfo.artistId;
    } else if (targetType === "artist") {
        artistObj = targetInfo;
    }

    const artistId = artistObj?._id || artistObj?.id || null;
    let artistViolationsCount = 0;
    let artistActiveStatus = "active";

    if (artistId) {
        const artist = await Artist.findById(artistId).select("violations activeStatus").lean();
        if (artist) {
            artistViolationsCount = artist.violations?.length || 0;
            artistActiveStatus = artist.activeStatus || "active";
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

    for (const report of groupReports) {
        const isValid = evaluationMap.has(String(report._id))
            ? evaluationMap.get(String(report._id))
            : false;

        report.isValidReason = isValid;
        report.handledBy = adminId;
        report.handledAt = new Date();
        report.resolutionNote = resolutionNote;

        if (action === "reject") {
            report.status = "rejected";
            report.resolution = "reject";
        } else {
            report.status = "resolved";
            report.resolution = action === "hide" || action === "hide7" ? "hide_content" : action === "block" ? "block_artist" : "warning";
        }

        await report.save();
    }

    // Check if admin did NOT reject the report group -> Any action except 'reject' adds +1 violation & sends warning notification
    const hasValidViolation = evaluations.some((e) => e.isValid === true);
    const shouldIncrementViolation = action !== "reject";

    // Penalty Tracking logic
    let updatedViolationsCount = 0;
    let newArtistStatus = "active";
    let penaltyAppliedMessage = action === "reject" ? "Đã từ chối báo cáo. Không tăng số lần vi phạm." : "";

    // If at least 1 report reason is valid AND action is not reject, increment artist violation count & apply penalty tier
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

            // Map valid report reasons for notification
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
                    const found = groupReports.find((r) => String(r._id) === String(e.reportId));
                    return found?.reason;
                })
                .filter(Boolean);

            const reasonSummary = Array.from(new Set(validReasons))
                .map((r) => REASON_MAP[r] || r)
                .join(", ");

            let extraInfo = "";
            if (reasonSummary) {
                extraInfo += `\n• Lý do vi phạm xác nhận: ${reasonSummary}`;
            }
            if (resolutionNote && resolutionNote.trim()) {
                extraInfo += `\n• Ghi chú từ Quản trị viên: "${resolutionNote.trim()}"`;
            }

            let notifTitle = "";
            let notifContent = "";

            // 5-Tier Penalty Schedule:
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
                notifContent = `Nội dung [${targetTitle}] tiếp tục bị xác nhận vi phạm.${extraInfo}\n\nĐây là cảnh báo nghiêm trọng lần 3. Nếu vi phạm lần thứ 4, nội dung sẽ bị ẩn khỏi hệ thống.`;
            } else if (updatedViolationsCount === 4) {
                penaltyAppliedMessage = "Đã tích lũy 4 lần vi phạm: Tự động ẩn nội dung bị báo cáo.";
                notifTitle = "Thông báo ẩn nội dung (Lần 4)";
                notifContent = `Nội dung [${targetTitle}] đã tích lũy 4 lần vi phạm và bị ẩn trên hệ thống.${extraInfo}`;

                if (targetType === "track") {
                    await Track.findByIdAndUpdate(targetId, { activeStatus: "hidden" });
                } else if (targetType === "album") {
                    await Album.findByIdAndUpdate(targetId, { status: "hidden" });
                }
            } else if (updatedViolationsCount >= 5) {
                penaltyAppliedMessage = `Đã tích lũy ${updatedViolationsCount} lần vi phạm: Khóa tài khoản nghệ sĩ.`;
                notifTitle = "Thông báo khóa tài khoản nghệ sĩ (Lần 5)";
                notifContent = `Tài khoản nghệ sĩ của bạn đã tích lũy ${updatedViolationsCount} lần vi phạm nội dung và đã bị KHÓA TÀI KHOẢN.${extraInfo}`;

                artist.activeStatus = "blocked";
                artist.blockedReason = `Tài khoản bị khóa tự động do tích lũy ${updatedViolationsCount} lần vi phạm nội dung từ báo cáo.`;
                newArtistStatus = "blocked";
            }

            await artist.save();

            // SEND IN-APP NOTIFICATION TO ARTIST ACCOUNT (artist.userId)
            if (artist.userId && notifTitle) {
                try {
                    await Notification.create({
                        userId: artist.userId,
                        type: "report",
                        title: notifTitle,
                        content: notifContent,
                        targetId: targetId,
                        targetType: targetType,
                        targetName: targetTitle,
                        receiverType: "single",
                        targetRoles: [],
                        sourceType: "system_auto",
                        createdBy: adminId || null,
                    });
                } catch (notifErr) {
                    console.error("Error creating notification for artist:", notifErr);
                }
            }
        }
    }

    // Execute explicit admin action overrides if selected in UI
    if (action === "hide") {
        if (targetType === "track") {
            await Track.findByIdAndUpdate(targetId, { activeStatus: "hidden" });
        } else if (targetType === "album") {
            await Album.findByIdAndUpdate(targetId, { status: "hidden" });
        }
    } else if (action === "block" && artistId) {
        const artistToBlock = await Artist.findByIdAndUpdate(artistId, {
            activeStatus: "blocked",
            blockedReason: resolutionNote || "Khoá nghệ sĩ từ xử lý báo cáo vi phạm.",
        });
        newArtistStatus = "blocked";

        if (artistToBlock?.userId) {
            try {
                await Notification.create({
                    userId: artistToBlock.userId,
                    type: "report",
                    title: "Thông báo khóa tài khoản nghệ sĩ",
                    content: resolutionNote || "Tài khoản nghệ sĩ của bạn đã bị quản trị viên khóa do vi phạm tiêu chuẩn nội dung.",
                    targetId: targetId,
                    targetType: targetType,
                    receiverType: "single",
                    targetRoles: [],
                    sourceType: "admin_manual",
                    createdBy: adminId || null,
                });
            } catch (err) {
                console.error("Error sending block notification:", err);
            }
        }
    }

    return {
        success: true,
        targetType,
        targetId,
        hasValidViolation,
        actionTaken: action,
        artistViolationsCount: updatedViolationsCount,
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
