import { AppError } from "../utils/AppError.js";
import formatResponse from "../utils/formatResponse.js";

const notFoundHandler = (req, res, next) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found.`, 404));
};

const resolveDuplicateResourceType = (error, field) => {
    const indexName = String(error?.index || error?.message || "").toLowerCase();
    if (indexName.includes("algorithm") && field === "trackId") return "AudioFingerprint";
    if (field === "sourceTrackId" || field === "matchedTrackId") return "AudioFingerprintMatch";
    if (field === "sourceAudioHash") return "CopyrightFingerprintBlocklist or audio fingerprint";
    if (indexName.includes("title") && indexName.includes("versiontitle")) return "Track title/version";
    if (field === "trackId") return "CopyrightRegistry";
    return "MongoDB unique resource";
};

const safeDuplicateIdentifier = (value) => {
    if (value === undefined || value === null) return "";
    const normalized = String(value);
    return normalized.length > 80 ? `${normalized.slice(0, 12)}...` : normalized;
};

const globalErrorHandler = (error, req, res, next) => {
    let normalizedError = error;

    if (error?.code === 11000) {
        const duplicatedField = Object.keys(error.keyPattern || {})[0] || "field";
        const resourceType = resolveDuplicateResourceType(error, duplicatedField);
        const duplicateIdentifier = safeDuplicateIdentifier(error.keyValue?.[duplicatedField]);

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

        normalizedError = new AppError("Resource already exists.", 409, {
            code: "DUPLICATE_RESOURCE",
            resourceType,
            field: duplicatedField,
            message: `${resourceType} collision on ${duplicatedField}.`,
        });
    }

    if (!(normalizedError instanceof AppError)) {
        console.error(normalizedError);
        normalizedError = new AppError("Internal server error.", 500);
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
