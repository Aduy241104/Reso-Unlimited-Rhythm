import { AppError } from "../utils/AppError.js";
import formatResponse from "../utils/formatResponse.js";

const notFoundHandler = (req, res, next) => {
    next(
        new AppError(
            `Không tìm thấy API ${req.method} ${req.originalUrl}.`,
            404
        )
    );
};

const resolveDuplicateResourceType = (error, field) => {
    const indexName = String(
        error?.index || error?.message || ""
    ).toLowerCase();

    if (indexName.includes("algorithm") && field === "trackId") {
        return "Dấu vân tay âm thanh";
    }

    if (field === "sourceTrackId" || field === "matchedTrackId") {
        return "Kết quả đối sánh dấu vân tay âm thanh";
    }

    if (field === "sourceAudioHash") {
        return "Dữ liệu dấu vân tay hoặc danh sách chặn bản quyền";
    }

    if (
        indexName.includes("title") &&
        indexName.includes("versiontitle")
    ) {
        return "Bài hát cùng tên và phiên bản";
    }

    if (field === "trackId") {
        return "Thông tin đăng ký bản quyền";
    }

    return "Dữ liệu";
};

const safeDuplicateIdentifier = (value) => {
    if (value === undefined || value === null) return "";

    const normalized = String(value);

    return normalized.length > 80
        ? `${normalized.slice(0, 12)}...`
        : normalized;
};

const globalErrorHandler = (error, req, res, next) => {
    let normalizedError = error;

    if (error?.code === 11000) {
        const duplicatedField =
            Object.keys(error.keyPattern || {})[0] || "field";

        const resourceType = resolveDuplicateResourceType(
            error,
            duplicatedField
        );

        const duplicateIdentifier = safeDuplicateIdentifier(
            error.keyValue?.[duplicatedField]
        );

        if (process.env.NODE_ENV !== "production") {
            console.warn("[MongoDuplicate]", {
                method: req.method,
                endpoint: req.originalUrl,
                resourceType,
                field: duplicatedField,
                index: error.index || "",
                identifier: duplicateIdentifier,
            });
        }

        const indexName = String(
            error?.index || error?.message || ""
        ).toLowerCase();

        if (
            duplicatedField === "nameKey" ||
            duplicatedField === "stageNameKey" ||
            indexName.includes("artist_name_key") ||
            indexName.includes("artist_request_stage_name_key")
        ) {
            const message =
                "Nghệ danh này đã được sử dụng. Vui lòng chọn nghệ danh khác.";
            normalizedError = new AppError(message, 409, {
                code: "ARTIST_STAGE_NAME_EXISTS",
                field: duplicatedField,
                message,
            });
        // Trùng tên + phiên bản bài hát của cùng nghệ sĩ
        } else if (
            indexName.includes("title") &&
            indexName.includes("versiontitle")
        ) {
            normalizedError = new AppError(
                "Bạn đã có một bài hát cùng tên và cùng phiên bản. Vui lòng đổi tên bài hát hoặc tên phiên bản.",
                409,
                {
                    code: "TRACK_TITLE_VERSION_EXISTS",
                    resourceType,
                    field: duplicatedField,
                    fields: [
                        "artist_artistId",
                        "title",
                        "versionTitle",
                    ],
                    message:
                        "Bài hát cùng tên và cùng phiên bản đã tồn tại.",
                }
            );
        } else {
            normalizedError = new AppError(
                `${resourceType} này đã tồn tại.`,
                409,
                {
                    code: "DUPLICATE_RESOURCE",
                    resourceType,
                    field: duplicatedField,
                    message: `${resourceType} bị trùng dữ liệu.`,
                }
            );
        }
    }

    if (!(normalizedError instanceof AppError)) {
        console.error(normalizedError);

        normalizedError = new AppError(
            "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
            500
        );
    }

    return formatResponse.error(
        res,
        normalizedError.message,
        normalizedError.statusCode,
        normalizedError.details
    );
};

export {
    notFoundHandler,
    globalErrorHandler,
};
