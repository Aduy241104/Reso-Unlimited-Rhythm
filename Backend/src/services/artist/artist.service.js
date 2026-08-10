import { StatusCodes } from "http-status-codes";
import Artist from "../../models/Artist.js";
import ArtistVerificationRequest from "../../models/ArtistVerificationRequest.js";
import { AppError } from "../../utils/AppError.js";
import { uploadImageBuffer, deleteImageByPublicId } from "../cloudinaryService.js";
import { extractPublicIdFromUrl } from "../../utils/uploadCloud.js";
import { formatArtistProfile } from "./artist.helper.js";
import { assertArtistOperational } from "./artist.status.helper.js";

const CLOUDINARY_ARTIST_FOLDER = "reso/artists";

const findOwnedArtistDocumentOrThrow = async (userId) => {
    const artist = await Artist.findOne({ userId });

    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ của tài khoản này.",
            StatusCodes.NOT_FOUND
        );
    }

    assertArtistOperational(artist);

    if (artist.activeStatus === "blocked") {
        throw new AppError(
            "Không thể cập nhật hồ sơ nghệ sĩ khi tài khoản đang bị khóa.",
            StatusCodes.FORBIDDEN
        );
    }

    return artist;
};

const enrichArtistProfilePayload = async (artistLean) => {
    const formatted = formatArtistProfile(artistLean);
    const pending = await ArtistVerificationRequest.exists({
        artistId: artistLean._id,
        status: "open",
    });

    return {
        ...formatted,
        hasPendingVerificationRequest: Boolean(pending),
    };
};

const getMyProfileByUserId = async (userId) => {
    const artist = await Artist.findOne({ userId })
        .populate({
            path: "userId",
            select: "email profile avatar role activeStatus",
        })
        .lean();

    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ của tài khoản này.",
            StatusCodes.NOT_FOUND
        );
    }

    return enrichArtistProfilePayload(artist);
};

const getMyBlockStatusByUserId = async (userId) => {
    const artist = await Artist.findOne({ userId })
        .select("activeStatus blockedReason")
        .lean();

    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ của tài khoản này.",
            StatusCodes.NOT_FOUND
        );
    }

    const isBlocked = artist.activeStatus === "blocked";

    return {
        isBlocked,
        activeStatus: artist.activeStatus,
        blockedReason: isBlocked ? artist.blockedReason ?? "" : "",
    };
};

const updateMyProfileByUserId = async (userId, payload) => {
    const artist = await findOwnedArtistDocumentOrThrow(userId);

    if (payload.name !== undefined) {
        artist.name = payload.name;
    }

    if (payload.bio !== undefined) {
        artist.bio = payload.bio;
    }

    if (payload.removeAvatar === true) {
        const currentAvatarUrl = artist.avatar;
        if (currentAvatarUrl) {
            const publicId = extractPublicIdFromUrl(currentAvatarUrl);
            if (publicId) {
                try {
                    const result = await deleteImageByPublicId(publicId, true);
                    console.log("[DEBUG] Delete avatar result:", result);
                } catch (err) {
                    console.error("[ERROR] Delete avatar failed:", err);
                }
            }
        }
        artist.avatar = "";
    }

    if (payload.removeCover === true) {
        const currentCoverUrl = artist.coverImage;
        if (currentCoverUrl) {
            const publicId = extractPublicIdFromUrl(currentCoverUrl);
            if (publicId) {
                try {
                    const result = await deleteImageByPublicId(publicId, true);
                    console.log("[DEBUG] Delete cover result:", result);
                } catch (err) {
                    console.error("[ERROR] Delete cover failed:", err);
                }
            }
        }
        artist.coverImage = "";
    }

    if (payload.socialLinks) {
        const current = artist.socialLinks?.toObject?.() ?? artist.socialLinks ?? {};
        const next = { ...current };

        for (const key of ["facebook", "instagram", "youtube", "tiktok", "spotify", "soundcloud", "website", "twitter", "other"]) {
            if (payload.socialLinks[key] !== undefined) {
                next[key] = payload.socialLinks[key];
            }
        }

        artist.socialLinks = next;
        artist.markModified("socialLinks");
    }

    await artist.save();

    return getMyProfileByUserId(userId);
};

const updateMyProfileMediaByUserId = async (userId, { avatarFile, coverFile }) => {
    if (!avatarFile && !coverFile) {
        throw new AppError(
            "Vui lòng cung cấp ít nhất một ảnh đại diện hoặc ảnh bìa.",
            StatusCodes.BAD_REQUEST
        );
    }

    const artist = await findOwnedArtistDocumentOrThrow(userId);

    if (avatarFile) {
        try {
            const uploaded = await uploadImageBuffer({
                buffer: avatarFile.buffer,
                folder: CLOUDINARY_ARTIST_FOLDER,
                publicId: `artist_${userId}_avatar_${Date.now()}`,
            });

            artist.avatar = uploaded.secure_url;
        } catch {
            throw new AppError(
                "Không thể tải ảnh đại diện lên. Vui lòng kiểm tra cấu hình lưu trữ và thử lại.",
                StatusCodes.BAD_GATEWAY
            );
        }
    }

    if (coverFile) {
        try {
            const uploaded = await uploadImageBuffer({
                buffer: coverFile.buffer,
                folder: CLOUDINARY_ARTIST_FOLDER,
                publicId: `artist_${userId}_cover_${Date.now()}`,
            });

            artist.coverImage = uploaded.secure_url;
        } catch {
            throw new AppError(
                "Không thể tải ảnh bìa lên. Vui lòng kiểm tra cấu hình lưu trữ và thử lại.",
                StatusCodes.BAD_GATEWAY
            );
        }
    }

    await artist.save();

    return getMyProfileByUserId(userId);
};

const requestVerificationByUserId = async (userId, payload = {}) => {
    const artist = await findOwnedArtistDocumentOrThrow(userId);

    const existing = await ArtistVerificationRequest.findOne({
        artistId: artist._id,
        status: "open",
    });

    if (existing) {
        throw new AppError(
            "Một yêu cầu xác minh đang được xem xét. Vui lòng chờ đội ngũ phản hồi.",
            StatusCodes.CONFLICT
        );
    }

    await ArtistVerificationRequest.create({
        artistId: artist._id,
        userId: artist.userId,
        note: typeof payload.note === "string" ? payload.note : "",
    });

    return getMyProfileByUserId(userId);
};

const getMyViolationsByUserId = async (userId) => {
    const artist = await Artist.findOne({ userId }).lean();
    if (!artist) {
        throw new AppError(
            "Không tìm thấy hồ sơ nghệ sĩ của tài khoản này.",
            StatusCodes.NOT_FOUND
        );
    }

    const Report = (await import("../../models/Report.js")).default;
    const Track = (await import("../../models/Track.js")).default;
    const Album = (await import("../../models/Album.js")).default;

    const [tracks, albums] = await Promise.all([
        Track.find({ artist_artistId: artist._id, isDeleted: { $ne: true } }).select("_id title").lean(),
        Album.find({ artistId: artist._id, isDeleted: { $ne: true } }).select("_id title").lean(),
    ]);

    const trackIds = tracks.map((t) => t._id);
    const albumIds = albums.map((a) => a._id);

    const targetTitleMap = {};
    targetTitleMap[String(artist._id)] = artist.name;
    tracks.forEach((t) => { targetTitleMap[String(t._id)] = t.title; });
    albums.forEach((a) => { targetTitleMap[String(a._id)] = a.title; });

    const reports = await Report.find({
        $or: [
            { targetType: "artist", targetId: artist._id },
            { targetType: "track", targetId: { $in: trackIds } },
            { targetType: "album", targetId: { $in: albumIds } },
        ],
    })
        .sort({ createdAt: -1 })
        .lean();

    const REASON_LABEL_MAP = {
        copyright_infringement: "Vi phạm bản quyền",
        harassment_or_hate: "Quấy rối / Phát ngôn thù ghét",
        nudity_or_sexual_content: "Nội dung đồi trụy / Nhạy cảm",
        violence_or_dangerous_content: "Bạo lực / Hành vi nguy hiểm",
        spam_or_scam: "Spam / Gian lận lượt nghe",
        misleading_information: "Thông tin sai lệch",
        impersonation: "Giả mạo nghệ sĩ / Thương hiệu",
        other: "Vi phạm quy định",
    };

    const PENALTY_LABEL_MAP = {
        warning: "Cảnh báo chính thức (+1 vi phạm)",
        hide_content: "Tạm ẩn / Gỡ nội dung",
        remove_content: "Gỡ bỏ tác phẩm",
        block_artist: "Đình chỉ / Khóa tài khoản",
        ignore: "Lưu hồ sơ theo dõi",
        reject: "Báo cáo bị từ chối",
        "": "Chưa áp dụng",
    };

    const violationItems = reports.map((r) => ({
        id: r._id,
        violationDate: r.handledAt || r.createdAt,
        createdAt: r.createdAt,
        violationType: REASON_LABEL_MAP[r.reason] || r.reason || "Vi phạm quy định",
        rawType: r.reason,
        description: r.description || "Báo cáo vi phạm nội dung",
        penalty: PENALTY_LABEL_MAP[r.resolution] || (r.status === "rejected" ? "Báo cáo bị từ chối" : "Đang xem xét"),
        rawPenalty: r.resolution,
        status: r.status,
        adminNotes: r.resolutionNote || "",
        images: r.images || [],
        targetType: r.targetType,
        targetTitle: targetTitleMap[String(r.targetId)] || (r.targetType === "artist" ? artist.name : r.targetType.toUpperCase()),
    }));

    const parseManualContent = (content) => {
        if (!content) return { targetType: "artist", targetTitle: artist.name, description: "Ghi nhận vi phạm kiểm duyệt" };
        const match = content.match(/\[(TRACK|ALBUM|ARTIST)\]:\s*(.*)/i);
        if (match) {
            const rawType = match[1].toLowerCase();
            const rawTitle = match[2].trim();
            const targetTypeName = rawType === "track" ? "bài hát" : rawType === "album" ? "album" : "hồ sơ nghệ sĩ";
            return {
                targetType: rawType,
                targetTitle: rawTitle || artist.name,
                description: `Báo cáo vi phạm quy định đối với ${targetTypeName} "${rawTitle || artist.name}"`,
            };
        }
        return {
            targetType: "artist",
            targetTitle: artist.name,
            description: content,
        };
    };

    const manualViolations = (artist.violations || []).map((v, index) => {
        const parsed = parseManualContent(v.content);
        return {
            id: `manual-${v._id || index}`,
            violationDate: v.violatedAt || artist.updatedAt,
            createdAt: v.violatedAt || artist.updatedAt,
            violationType: "Vi phạm quy định nghệ sĩ",
            rawType: "other",
            description: parsed.description,
            penalty: "Cảnh báo chính thức (+1 vi phạm)",
            rawPenalty: "warning",
            status: "resolved",
            adminNotes: "Ghi nhận vi phạm trực tiếp bởi Ban quản trị",
            images: [],
            targetType: parsed.targetType,
            targetTitle: parsed.targetTitle,
        };
    });

    let combinedViolations = [];
    if (violationItems.length > 0) {
        combinedViolations = [...violationItems];
        const resolvedReportsCount = violationItems.filter((r) => r.status === "resolved").length;
        if (manualViolations.length > resolvedReportsCount) {
            const extraManuals = manualViolations.slice(resolvedReportsCount);
            combinedViolations.push(...extraManuals);
        }
    } else {
        combinedViolations = manualViolations;
    }

    // Sort strictly newest first (mới nhất lên đầu)
    combinedViolations.sort((a, b) => {
        const dateA = new Date(a.violationDate || a.createdAt).getTime();
        const dateB = new Date(b.violationDate || b.createdAt).getTime();
        return dateB - dateA;
    });

    return {
        artistInfo: {
            id: artist._id,
            name: artist.name,
            avatar: artist.avatar,
            activeStatus: artist.activeStatus,
            blockedReason: artist.blockedReason || "",
            violationsCount: artist.violations?.length || 0,
            maxAllowedViolations: 5,
        },
        violations: combinedViolations,
    };
};

export default {
    getMyProfileByUserId,
    getMyBlockStatusByUserId,
    updateMyProfileByUserId,
    updateMyProfileMediaByUserId,
    requestVerificationByUserId,
    getMyViolationsByUserId,
};
