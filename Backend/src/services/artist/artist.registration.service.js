import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import ArtistRequest from "../../models/ArtistRequest.js";
import Artist from "../../models/Artist.js";
import { AppError } from "../../utils/AppError.js";
import { uploadImageBuffer } from "../cloudinaryService.js";
import { assertArtistStageNameAvailable } from "./artist.name.service.js";

const normalizeString = (value) => {
    if (typeof value !== "string") {
        return "";
    }

    return value.replace(/\s+/g, " ").trim();
};

const normalizeStringArray = (value) => {
    if (Array.isArray(value)) {
        return value
            .map((item) => normalizeString(item))
            .filter(Boolean);
    }

    const normalizedSingleValue = normalizeString(value);
    return normalizedSingleValue ? [normalizedSingleValue] : [];
};

const normalizeSocialLinks = (value = {}) => ({
    spotify: normalizeString(value.spotify),
    youtube: normalizeString(value.youtube),
    tiktok: normalizeString(value.tiktok),
    facebook: normalizeString(value.facebook),
    instagram: normalizeString(value.instagram),
    soundcloud: normalizeString(value.soundcloud),
    website: normalizeString(value.website),
    other: normalizeString(value.other),
});

const hasAtLeastOneSocialLink = (socialLinks = {}) =>
    Object.values(socialLinks).some((value) => Boolean(normalizeString(value)));

const buildDefaultChecklist = () => ({
    profileComplete: false,
    identityVerified: false,
    hasMusicActivity: false,
    socialLinksValid: false,
    noImpersonation: false,
    acceptedCopyrightPolicy: false,
});

const CLOUDINARY_ARTIST_REQUESTS_FOLDER = "reso/artist-requests";
const MIN_ARTIST_AGE = 16;
const MAX_STAGE_NAME_LENGTH = 100;
const MAX_FULL_NAME_LENGTH = 100;
const MAX_ID_NUMBER_LENGTH = 20;
const STAGE_NAME_DISALLOWED_STATUSES = ["pending", "approved"];
const ID_NUMBER_DISALLOWED_STATUSES = ["pending", "approved"];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildExactTextRegex = (value) => {
    const normalized = normalizeString(value);
    const pattern = escapeRegex(normalized).replace(/\s+/g, "\\s+");
    return new RegExp(`^${pattern}$`, "i");
};

const hasProvidedImage = (file, fallbackValue) =>
    Boolean(file || normalizeString(fallbackValue));

const isValidIdentityNumber = (value) => /^[0-9]{9,12}$/.test(value);

const parseDateOnly = (value) => {
    const normalized = normalizeString(value);

    if (!normalized) {
        return null;
    }

    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
        return null;
    }

    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.getUTCFullYear() !== year ||
        parsedDate.getUTCMonth() !== month - 1 ||
        parsedDate.getUTCDate() !== day
    ) {
        return null;
    }

    return parsedDate;
};

const calculateAge = (dateOfBirth, now = new Date()) => {
    let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
    const monthOffset = now.getUTCMonth() - dateOfBirth.getUTCMonth();

    if (
        monthOffset < 0 ||
        (monthOffset === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())
    ) {
        age -= 1;
    }

    return age;
};

const findExistingArtistByStageName = (stageName) =>
    Artist.findOne({ name: buildExactTextRegex(stageName) })
        .select("_id name")
        .lean();

const findConflictingArtistRequestByStageName = ({ userId, stageName }) =>
    ArtistRequest.findOne({
        userId: { $ne: userId },
        status: { $in: STAGE_NAME_DISALLOWED_STATUSES },
        stageName: buildExactTextRegex(stageName),
    })
        .select("_id stageName status")
        .lean();

const findConflictingArtistRequestByIdNumber = ({ userId, idNumber }) =>
    ArtistRequest.findOne({
        userId: { $ne: userId },
        status: { $in: ID_NUMBER_DISALLOWED_STATUSES },
        "identityInfo.idNumber": idNumber,
    })
        .select("_id status identityInfo.idNumber")
        .lean();

const ensureEligibleUser = async (userId) => {
    const [existingArtist, pendingRequest] = await Promise.all([
        Artist.findOne({ userId }).select("_id").lean(),
        ArtistRequest.findOne({ userId, status: "pending" }).select("_id").lean(),
    ]);

    if (existingArtist) {
        throw new AppError("Tài khoản này đã là nghệ sĩ.", 409, {
            field: "role",
        });
    }

    if (pendingRequest) {
        throw new AppError(
            "Bạn đã có một yêu cầu đăng ký nghệ sĩ đang chờ duyệt.",
            409,
            { field: "status" }
        );
    }
};

const validateRequiredFields = (payload = {}, files = {}) => {
    const stageName = normalizeString(payload.stageName);
    const fullName = normalizeString(payload.fullName);
    const idNumber = normalizeString(payload.idNumber);
    const dateOfBirth = normalizeString(payload.dateOfBirth);
    const parsedDateOfBirth = parseDateOnly(dateOfBirth);
    const socialLinks = normalizeSocialLinks(payload.socialLinks);
    const demoTrackUrls = normalizeStringArray(payload.demoTrackUrls);
    const musicLinks = normalizeStringArray(payload.musicLinks);
    const acceptedTerms =
        payload.acceptedTerms === true || payload.acceptedTerms === "true";
    const copyrightCommitment =
        payload.copyrightCommitment === true || payload.copyrightCommitment === "true";
    const truthfulInformationCommitment =
        payload.truthfulInformationCommitment === true ||
        payload.truthfulInformationCommitment === "true";

    const fieldErrors = [];

    if (!stageName) {
        fieldErrors.push({
            field: "stageName",
            message: "Tên nghệ sĩ là bắt buộc.",
        });
    } else if (stageName.length > MAX_STAGE_NAME_LENGTH) {
        fieldErrors.push({
            field: "stageName",
            message: `Tên nghệ sĩ không được vượt quá ${MAX_STAGE_NAME_LENGTH} ký tự.`,
        });
    }

    if (!fullName) {
        fieldErrors.push({
            field: "fullName",
            message: "Họ và tên thật là bắt buộc.",
        });
    } else if (fullName.length > MAX_FULL_NAME_LENGTH) {
        fieldErrors.push({
            field: "fullName",
            message: `Họ và tên thật không được vượt quá ${MAX_FULL_NAME_LENGTH} ký tự.`,
        });
    }

    if (!idNumber) {
        fieldErrors.push({
            field: "idNumber",
            message: "Số CCCD/CMND là bắt buộc.",
        });
    } else if (idNumber.length > MAX_ID_NUMBER_LENGTH) {
        fieldErrors.push({
            field: "idNumber",
            message: `Số CCCD/CMND không được vượt quá ${MAX_ID_NUMBER_LENGTH} ký tự.`,
        });
    } else if (!isValidIdentityNumber(idNumber)) {
        fieldErrors.push({
            field: "idNumber",
            message: "Số CCCD/CMND phải gồm từ 9 đến 12 chữ số.",
        });
    }

    if (!dateOfBirth) {
        fieldErrors.push({
            field: "dateOfBirth",
            message: "Ngày sinh là bắt buộc.",
        });
    } else if (!parsedDateOfBirth) {
        fieldErrors.push({
            field: "dateOfBirth",
            message: "Ngày sinh không hợp lệ.",
        });
    } else {
        const now = new Date();
        const age = calculateAge(parsedDateOfBirth, now);

        if (parsedDateOfBirth > now) {
            fieldErrors.push({
                field: "dateOfBirth",
                message: "Ngày sinh không được ở tương lai.",
            });
        } else if (age < MIN_ARTIST_AGE) {
            fieldErrors.push({
                field: "dateOfBirth",
                message: `Bạn phải đủ ${MIN_ARTIST_AGE} tuổi để đăng ký nghệ sĩ.`,
            });
        }
    }

    if (!hasProvidedImage(files.frontImage?.[0], payload.frontImage)) {
        fieldErrors.push({
            field: "frontImage",
            message: "Vui lòng tải ảnh mặt trước giấy tờ.",
        });
    }

    if (!hasProvidedImage(files.backImage?.[0], payload.backImage)) {
        fieldErrors.push({
            field: "backImage",
            message: "Vui lòng tải ảnh mặt sau giấy tờ.",
        });
    }

    if (!hasAtLeastOneSocialLink(socialLinks)) {
        fieldErrors.push({
            field: "socialLinks",
            message:
                "Vui lĂ²ng nháº­p Ă­t nháº¥t 1 liĂªn káº¿t Website, LiĂªn káº¿t khĂ¡c, TikTok, Instagram, SoundCloud, Facebook, YouTube hoáº·c Spotify.",
        });
    }

    if (demoTrackUrls.length === 0 && musicLinks.length === 0) {
        const portfolioLinkRequiredMessage =
            "Vui lòng thêm ít nhất 1 link demo bài hát hoặc 1 link sản phẩm âm nhạc đã phát hành.";

        fieldErrors.push({
            field: "demoTrackUrls",
            message: portfolioLinkRequiredMessage,
        });
        fieldErrors.push({
            field: "musicLinks",
            message: portfolioLinkRequiredMessage,
        });
    }

    if (!acceptedTerms) {
        fieldErrors.push({
            field: "acceptedTerms",
            message: "Bạn cần đồng ý với điều khoản nghệ sĩ.",
        });
    }

    if (!copyrightCommitment) {
        fieldErrors.push({
            field: "copyrightCommitment",
            message: "Bạn cần xác nhận trách nhiệm bản quyền.",
        });
    }

    if (!truthfulInformationCommitment) {
        fieldErrors.push({
            field: "truthfulInformationCommitment",
            message: "Bạn cần xác nhận thông tin là trung thực và chính xác.",
        });
    }

    if (fieldErrors.length > 0) {
        throw new AppError("Thông tin đăng ký nghệ sĩ không hợp lệ.", 400, fieldErrors);
    }

    return {
        stageName,
        fullName,
        idNumber,
        dateOfBirth,
        parsedDateOfBirth,
        socialLinks,
        demoTrackUrls,
        musicLinks,
        acceptedTerms,
        copyrightCommitment,
        truthfulInformationCommitment,
    };
};

const ensureUniqueArtistRegistrationFields = async ({ userId, stageName, idNumber }) => {
    const [existingArtist, conflictingArtistRequest, conflictingIdNumberRequest] =
        await Promise.all([
            findExistingArtistByStageName(stageName),
            findConflictingArtistRequestByStageName({ userId, stageName }),
            findConflictingArtistRequestByIdNumber({ userId, idNumber }),
        ]);

    const fieldErrors = [];

    if (existingArtist || conflictingArtistRequest) {
        fieldErrors.push({
            field: "stageName",
            message: "Tên nghệ sĩ đã tồn tại. Vui lòng chọn tên khác.",
        });
    }

    if (conflictingIdNumberRequest) {
        fieldErrors.push({
            field: "idNumber",
            message: "Số CCCD/CMND này đã được dùng trong một hồ sơ đăng ký nghệ sĩ khác.",
        });
    }

    if (fieldErrors.length > 0) {
        throw new AppError("Thông tin đăng ký nghệ sĩ bị trùng.", 409, fieldErrors);
    }
};

const checkStageNameAvailabilityByUserId = async (userId, rawStageName = "") => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError("Mã người dùng không hợp lệ.", 400, {
            field: "userId",
        });
    }

    const stageName = normalizeString(rawStageName);

    if (!stageName) {
        throw new AppError("Tên nghệ sĩ là bắt buộc.", 400, {
            field: "stageName",
        });
    }

    if (stageName.length > MAX_STAGE_NAME_LENGTH) {
        throw new AppError(
            `Tên nghệ sĩ không được vượt quá ${MAX_STAGE_NAME_LENGTH} ký tự.`,
            400,
            {
                field: "stageName",
            }
        );
    }

    const [existingArtist, conflictingArtistRequest] = await Promise.all([
        findExistingArtistByStageName(stageName),
        findConflictingArtistRequestByStageName({ userId, stageName }),
    ]);

    if (existingArtist || conflictingArtistRequest) {
        return {
            available: false,
            stageName,
            message: "Tên nghệ sĩ đã tồn tại. Vui lòng chọn tên khác.",
        };
    }

    return {
        available: true,
        stageName,
        message: "Tên nghệ sĩ có thể sử dụng.",
    };
};

const checkIdNumberAvailabilityByUserId = async (userId, rawIdNumber = "") => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError("Mã người dùng không hợp lệ.", 400, {
            field: "userId",
        });
    }

    const idNumber = normalizeString(rawIdNumber);

    if (!idNumber) {
        throw new AppError("Số CCCD/CMND là bắt buộc.", 400, {
            field: "idNumber",
        });
    }

    if (idNumber.length > MAX_ID_NUMBER_LENGTH) {
        throw new AppError(
            `Số CCCD/CMND không được vượt quá ${MAX_ID_NUMBER_LENGTH} ký tự.`,
            400,
            {
                field: "idNumber",
            }
        );
    }

    if (!isValidIdentityNumber(idNumber)) {
        throw new AppError("Số CCCD/CMND phải gồm từ 9 đến 12 chữ số.", 400, {
            field: "idNumber",
        });
    }

    const conflictingArtistRequest = await findConflictingArtistRequestByIdNumber({
        userId,
        idNumber,
    });

    if (conflictingArtistRequest) {
        return {
            available: false,
            idNumber,
            message: "Số CCCD/CMND này đã được dùng trong một hồ sơ đăng ký nghệ sĩ khác.",
        };
    }

    return {
        available: true,
        idNumber,
        message: "Số CCCD/CMND có thể sử dụng.",
    };
};

const uploadArtistRequestImage = async (userId, file, label) => {
    if (!file) {
        return "";
    }

    try {
        const uploaded = await uploadImageBuffer({
            buffer: file.buffer,
            folder: CLOUDINARY_ARTIST_REQUESTS_FOLDER,
            publicId: `artist_request_${userId}_${label}_${Date.now()}`,
        });

        return uploaded.secure_url ?? "";
    } catch {
        throw new AppError(
            `Không thể tải ảnh ${label} lên. Vui lòng kiểm tra cấu hình lưu trữ và thử lại.`,
            StatusCodes.BAD_GATEWAY,
            { field: label }
        );
    }
};

const createArtistRegistrationRequestByUserId = async (userId, payload = {}, files = {}) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new AppError("Mã người dùng không hợp lệ.", 400, {
            field: "userId",
        });
    }

    await ensureEligibleUser(userId);

    const validated = validateRequiredFields(payload, files);
    const stageNameKey = await assertArtistStageNameAvailable(validated.stageName);
    await ensureUniqueArtistRegistrationFields({
        userId,
        stageName: validated.stageName,
        idNumber: validated.idNumber,
    });
    const avatarUrl = await uploadArtistRequestImage(userId, files.avatar?.[0], "avatar");
    const frontImageUrl = await uploadArtistRequestImage(
        userId,
        files.frontImage?.[0],
        "frontImage"
    );
    const backImageUrl = await uploadArtistRequestImage(
        userId,
        files.backImage?.[0],
        "backImage"
    );
    const now = new Date();

    const artistRequest = await ArtistRequest.create({
        userId,
        stageName: validated.stageName,
        stageNameKey,
        bio: normalizeString(payload.bio),
        avatar: avatarUrl || normalizeString(payload.avatar),
        genres: normalizeStringArray(payload.genres),
        socialLinks: validated.socialLinks,
        identityInfo: {
            idNumber: validated.idNumber,
            fullName: validated.fullName,
            dateOfBirth: validated.parsedDateOfBirth ?? undefined,
            frontImage: frontImageUrl || normalizeString(payload.frontImage),
            backImage: backImageUrl || normalizeString(payload.backImage),
        },
        portfolio: {
            demoTrackUrls: validated.demoTrackUrls,
            musicLinks: validated.musicLinks,
            description: normalizeString(payload.portfolioDescription),
        },
        artistDeclaration: {
            acceptedTerms: validated.acceptedTerms,
            copyrightCommitment: validated.copyrightCommitment,
            truthfulInformationCommitment: validated.truthfulInformationCommitment,
            acceptedAt: now,
        },
        review: {
            adminNote: "",
            checklist: buildDefaultChecklist(),
        },
        status: "pending",
    });

    return artistRequest.toObject();
};

export default {
    createArtistRegistrationRequestByUserId,
    checkStageNameAvailabilityByUserId,
    checkIdNumberAvailabilityByUserId,
};
