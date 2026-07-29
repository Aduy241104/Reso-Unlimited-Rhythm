import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Report from "../../models/Report.js";
import { AppError } from "../../utils/AppError.js";
import { uploadImageBuffer } from "../cloudinaryService.js";

const CLOUDINARY_REPORTS_FOLDER = "reso/reports";
const ALLOWED_TARGET_TYPES = ["track", "album", "artist"];
const ALLOWED_REPORT_REASONS = [
  "copyright_infringement",
  "harassment_or_hate",
  "nudity_or_sexual_content",
  "violence_or_dangerous_content",
  "spam_or_scam",
  "misleading_information",
  "impersonation",
  "other",
];

const normalizeString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizeDescription = (value) => normalizeString(value).slice(0, 2000);

const normalizeImageFiles = (files) => {
  if (!Array.isArray(files)) {
    return [];
  }

  return files.filter((file) => file?.buffer);
};

const validateCreateReportPayload = (payload = {}) => {
  const targetId = normalizeString(payload.targetId);
  const targetType = normalizeString(payload.targetType).toLowerCase();
  const reason = normalizeString(payload.reason).toLowerCase();
  const description = normalizeDescription(payload.description);

  const fieldErrors = [];

  if (!targetId) {
    fieldErrors.push({ field: "targetId", message: "Target id is required." });
  } else if (!mongoose.Types.ObjectId.isValid(targetId)) {
    fieldErrors.push({ field: "targetId", message: "Target id is invalid." });
  }

  if (!targetType) {
    fieldErrors.push({ field: "targetType", message: "Target type is required." });
  } else if (!ALLOWED_TARGET_TYPES.includes(targetType)) {
    fieldErrors.push({
      field: "targetType",
      message: `Target type must be one of: ${ALLOWED_TARGET_TYPES.join(", ")}.`,
    });
  }

  if (!reason) {
    fieldErrors.push({ field: "reason", message: "Report reason is required." });
  } else if (!ALLOWED_REPORT_REASONS.includes(reason)) {
    fieldErrors.push({
      field: "reason",
      message: `Reason must be one of: ${ALLOWED_REPORT_REASONS.join(", ")}.`,
    });
  }

  if (!description) {
    fieldErrors.push({ field: "description", message: "Description is required." });
  }

  if (fieldErrors.length > 0) {
    throw new AppError("Invalid report data.", StatusCodes.BAD_REQUEST, fieldErrors);
  }

  return {
    targetId,
    targetType,
    reason,
    description,
  };
};

const uploadReportImage = async (userId, file, index) => {
  try {
    const uploaded = await uploadImageBuffer({
      buffer: file.buffer,
      folder: CLOUDINARY_REPORTS_FOLDER,
      publicId: `report_${userId}_${Date.now()}_${index}`,
    });

    return uploaded.secure_url ?? "";
  } catch {
    throw new AppError(
      "Could not upload report evidence image. Check storage configuration and try again.",
      StatusCodes.BAD_GATEWAY,
      { field: "images" }
    );
  }
};

const createReportByUserId = async (userId, payload = {}, files = []) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("User id is invalid.", StatusCodes.BAD_REQUEST, {
      field: "userId",
    });
  }

  const validated = validateCreateReportPayload(payload);
  const imageFiles = normalizeImageFiles(files);
  const imageUrls = await Promise.all(
    imageFiles.map((file, index) => uploadReportImage(userId, file, index))
  );

  const report = await Report.create({
    userId,
    targetId: validated.targetId,
    targetType: validated.targetType,
    reason: validated.reason,
    description: validated.description,
    images: imageUrls.filter(Boolean),
    status: "pending",
  });

  return report.toObject();
};

const getReportsByUserId = async (userId, params = {}) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("User id is invalid.", StatusCodes.BAD_REQUEST, {
      field: "userId",
    });
  }

  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(params.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const sortField = params.sortField || "createdAt";
  const sortOrder = params.sortOrder === "asc" ? 1 : -1;

  const filter = { userId };

  if (params.status) {
    filter.status = params.status;
  }

  if (params.targetType) {
    filter.targetType = params.targetType;
  }

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(filter),
  ]);

  return {
    reports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getReportById = async (userId, reportId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError("User id is invalid.", StatusCodes.BAD_REQUEST, {
      field: "userId",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new AppError("Report id is invalid.", StatusCodes.BAD_REQUEST, {
      field: "reportId",
    });
  }

  const report = await Report.findOne({ _id: reportId, userId }).lean();

  if (!report) {
    throw new AppError("Report not found.", StatusCodes.NOT_FOUND);
  }

  return report;
};

export default {
  ALLOWED_REPORT_REASONS,
  ALLOWED_TARGET_TYPES,
  createReportByUserId,
  getReportsByUserId,
  getReportById,
};
