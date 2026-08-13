import crypto from "node:crypto";
import mongoose from "mongoose";
import AuditLog from "../../models/AuditLog.js";

const SENSITIVE_KEYS = new Set([
    "password",
    "passwordHash",
    "token",
    "accessToken",
    "refreshToken",
    "secret",
    "storageUrl",
]);

const sanitizeMetadata = (value) => {
    if (Array.isArray(value)) return value.map(sanitizeMetadata);
    if (!value || typeof value !== "object") return value;

    return Object.entries(value).reduce((result, [key, nestedValue]) => {
        if (!SENSITIVE_KEYS.has(key)) result[key] = sanitizeMetadata(nestedValue);
        return result;
    }, {});
};

export const recordAuditEvent = async ({
    actorUserId,
    actorSnapshot = {},
    action,
    targetType,
    targetId,
    metadata = {},
}) => {
    // Audit logging must never make a user-facing mutation fail when Mongo is unavailable.
    if (mongoose.connection.readyState !== 1 || !action || !targetType) return null;

    const previous = await AuditLog.findOne({}).sort({ occurredAt: -1, _id: -1 }).select("eventHash").lean();
    const sanitizedMetadata = sanitizeMetadata(metadata);
    const payload = JSON.stringify({
        previousHash: previous?.eventHash || "",
        actorUserId: actorUserId ? String(actorUserId) : "",
        action,
        targetType,
        targetId: targetId ? String(targetId) : "",
        metadata: sanitizedMetadata,
    });
    const eventHash = crypto.createHash("sha256").update(payload).digest("hex");

    return AuditLog.create({
        actorUserId,
        actorSnapshot: {
            id: actorSnapshot.id || actorUserId,
            email: actorSnapshot.email || "",
            role: actorSnapshot.role || "",
        },
        action,
        targetType,
        targetId,
        metadata: sanitizedMetadata,
        previousHash: previous?.eventHash || "",
        eventHash,
    });
};

export default { recordAuditEvent };
