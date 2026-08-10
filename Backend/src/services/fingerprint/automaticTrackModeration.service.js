import mongoose from "mongoose";
import AudioFingerprint from "../../models/AudioFingerprint.js";
import AudioFingerprintMatch from "../../models/AudioFingerprintMatch.js";
import CopyrightFingerprintBlocklist from "../../models/CopyrightFingerprintBlocklist.js";
import Artist from "../../models/Artist.js";
import Notification from "../../models/Notification.js";
import Track from "../../models/Track.js";
import { getIO } from "../../config/socket.js";
import { recordExactFileDuplicateMatch } from "./audioFingerprint.matching.service.js";
import { recordAuditEvent } from "../audit/auditLog.service.js";
import {
    activeFingerprintScopeFilter,
    retainTrackFingerprintForEnforcement,
} from "./fingerprint.lifecycle.service.js";

const isEnabled = () => process.env.FINGERPRINT_AUTO_MODERATION !== "false";
const isValidTrackId = (trackId) => mongoose.Types.ObjectId.isValid(trackId);

const getArtistForNotification = async (track) => {
    if (!track?.artist_artistId) return null;

    return Artist.findById(track.artist_artistId)
        .select("_id userId name")
        .lean();
};

const notifyArtist = async ({ track, artist, status, note }) => {
    if (!artist?.userId) return;

    const approved = status === "approved";
    const notification = await Notification.create({
        userId: artist.userId,
        type: "system",
        title: approved
            ? `Bài hát "${track.title}" đã được duyệt tự động`
            : `Bài hát "${track.title}" bị từ chối tự động`,
        content: approved
            ? "Fingerprint không phát hiện bản ghi trùng có độ tin cậy cao."
            : `${note || "Fingerprint phát hiện bản ghi âm có khả năng trùng."}`,
        isRead: false,
        actorId: null,
        actorType: "system",
        artistId: artist._id,
        targetId: track._id,
        targetType: "track",
        targetName: track.title || "",
        thumbnail: track.avatar || track.coverImage?.[0] || "",
        sourceType: "system_auto",
        receiverType: "single",
        isGlobal: false,
        readBy: [],
        deletedBy: [],
        createdBy: null,
    });

    try {
        getIO().to(String(artist.userId)).emit("new_notification", notification.toObject());
    } catch {
        // The database notification is still useful when Socket.IO is unavailable.
    }
};

const buildModerationState = (track, values) => ({
    ...(track.moderation?.toObject?.() || track.moderation || {}),
    submittedAt: track.moderation?.submittedAt || track.createdAt || new Date(),
    reviewedBy: null,
    reviewedAt: new Date(),
    adminNote: values.adminNote,
    violationFlags: values.violationFlags,
});

const rejectTrack = async (track, { reason, match, enforcementEvidence = null }) => {
    track.approvalStatus = "rejected";
    track.activeStatus = "draft";
    track.rejectReason = reason;
    track.moderation = buildModerationState(track, {
        adminNote: "Tự động từ chối bởi hệ thống fingerprint.",
        violationFlags: ["copyright", "duplicate_track"],
    });

    if (track.copyright) {
        track.copyright.copyrightStatus = "disputed";
    }

    const retained = enforcementEvidence
        ? { enforcementEvidence }
        : await retainTrackFingerprintForEnforcement(track, {
            reasonCode: match?.matchType === "exact_file_duplicate" ? "exact_duplicate" : "copyright_violation",
            reason,
            matchId: match?._id || null,
        });
    const retainedEvidence = retained.enforcementEvidence || null;

    track.fingerprintScreening = {
        ...(track.fingerprintScreening?.toObject?.() || track.fingerprintScreening || {}),
        status: "flagged",
        exactDuplicate: match?.matchType === "exact_file_duplicate" || Boolean(enforcementEvidence),
        riskLevel: "high",
        matchedTrackId: match?.sourceTrackId?.toString() === track._id.toString()
            ? match?.matchedTrackId || null
            : match?.sourceTrackId || null,
        enforcementEvidenceId: retainedEvidence?._id || null,
        completedAt: new Date(),
    };

    await track.save();
    void recordAuditEvent({
        action: "TRACK_AUTO_REJECTED_FINGERPRINT",
        targetType: "track",
        targetId: track._id,
        metadata: {
            source: "automatic_fingerprint",
            reason,
            matchId: match?._id || null,
            enforcementEvidenceId: retainedEvidence?._id || null,
            fingerprintScreening: track.fingerprintScreening || null,
        },
    }).catch((error) => console.error("Automatic fingerprint audit failed:", error.message));

    const artist = await getArtistForNotification(track);
    await notifyArtist({ track, artist, status: "rejected", note: reason });

    return {
        status: "rejected",
        reason,
        matchId: match?._id || null,
    };
};

const findExactDuplicate = async (trackId, sourceAudioHash) => {
    if (!sourceAudioHash) return null;

    const candidates = await AudioFingerprint.find({
        trackId: { $ne: trackId },
        algorithm: "chromaprint",
        algorithmVersion: "chromaprint-v1",
        status: "completed",
        ...activeFingerprintScopeFilter(),
        sourceAudioHash,
    })
        .sort({ createdAt: 1 })
        .lean();

    if (!candidates.length) return null;

    // Deleting a track remains a soft delete so its audit history is retained.
    // It must not, however, make a later upload of the artist's own test/draft
    // file impossible. Only non-deleted tracks can block a new submission.
    const activeTracks = await Track.find({
        _id: { $in: candidates.map((candidate) => candidate.trackId) },
        isDeleted: { $ne: true },
    })
        .select("_id")
        .lean();
    const activeTrackIds = new Set(activeTracks.map((track) => String(track._id)));

    const activeCandidate = candidates.find((candidate) => activeTrackIds.has(String(candidate.trackId)));
    if (activeCandidate) return activeCandidate;

    return CopyrightFingerprintBlocklist.findOne({
        algorithm: "chromaprint",
        algorithmVersion: "chromaprint-v1",
        sourceAudioHash,
        status: "active",
    }).sort({ createdAt: 1 }).lean().then((evidence) => evidence
        ? { enforcementEvidenceId: evidence._id, sourceTrackId: evidence.sourceTrackId || null, evidence }
        : null);
};

const isMatchEligibleForTrack = async (match, trackId) => {
    if (!match) return false;
    const otherTrackId = String(match.sourceTrackId) === String(trackId)
        ? match.matchedTrackId
        : match.sourceTrackId;
    if (!otherTrackId) return false;

    const activeTrack = await Track.exists({ _id: otherTrackId, isDeleted: { $ne: true } });
    if (activeTrack) return true;

    return Boolean(await CopyrightFingerprintBlocklist.exists({
        sourceTrackId: otherTrackId,
        status: "active",
    }));
};

const findHighConfidenceMatch = async (trackId, audioVersion = null) => {
    const match = await AudioFingerprintMatch.findOne({
        $and: [
            { status: { $in: ["detected", "under_review"] } },
            { matchingScope: { $in: ["active", null] } },
            {
                $or: [
                    { sourceTrackId: trackId, $or: [{ sourceAudioVersion: audioVersion }, { sourceAudioVersion: null }] },
                    { matchedTrackId: trackId, $or: [{ matchedAudioVersion: audioVersion }, { matchedAudioVersion: null }] },
                ],
            },
            {
                $or: [
                    { matchType: "exact_file_duplicate" },
                    { severity: "high" },
                    { riskLevel: "high" },
                ],
            },
        ],
    })
        .sort({ createdAt: -1 })
        .lean();
    return (await isMatchEligibleForTrack(match, trackId)) ? match : null;
};

const findReviewConfidenceMatch = async (trackId, audioVersion = null) => {
    const match = await AudioFingerprintMatch.findOne({
        $and: [
            { status: { $in: ["detected", "under_review", "confirmed"] } },
            { matchingScope: { $in: ["active", null] } },
            {
                $or: [
                    { sourceTrackId: trackId, $or: [{ sourceAudioVersion: audioVersion }, { sourceAudioVersion: null }] },
                    { matchedTrackId: trackId, $or: [{ matchedAudioVersion: audioVersion }, { matchedAudioVersion: null }] },
                ],
            },
            { $or: [{ severity: "review" }, { riskLevel: "medium" }] },
        ],
    })
        .sort({ similarityScore: -1, createdAt: -1 })
        .lean();
    return (await isMatchEligibleForTrack(match, trackId)) ? match : null;
};

export const evaluateAutomaticTrackModeration = async (
    trackId,
    { fingerprintReady = false } = {}
) => {
    if (!isEnabled() || !isValidTrackId(trackId)) {
        return { status: "skipped" };
    }

    const track = await Track.findOne({ _id: trackId, isDeleted: { $ne: true } });
    if (!track || track.approvalStatus !== "pending") {
        return { status: "not_pending" };
    }

    const fingerprint = await AudioFingerprint.findOne({
        trackId: track._id,
        algorithm: "chromaprint",
        algorithmVersion: "chromaprint-v1",
        ...activeFingerprintScopeFilter(),
    }).lean();

    const exactDuplicate = await findExactDuplicate(
        track._id,
        fingerprint?.sourceAudioHash || ""
    );

    if (exactDuplicate) {
        if (exactDuplicate.enforcementEvidenceId) {
            return rejectTrack(track, {
                match: null,
                enforcementEvidence: exactDuplicate.evidence,
                reason: "Bản ghi âm trùng với fingerprint đã được lưu giữ do vi phạm bản quyền hoặc duplicate.",
            });
        }

        const match = await recordExactFileDuplicateMatch({
            sourceTrackId: track._id,
            matchedTrackId: exactDuplicate.trackId,
        });

        return rejectTrack(track, {
            match,
            reason: "Bản ghi âm trùng hoàn toàn với một bài hát đã có trong hệ thống.",
        });
    }

    if (fingerprint?.status !== "completed") {
        return { status: "pending_fingerprint" };
    }

    const highConfidenceMatch = await findHighConfidenceMatch(track._id, fingerprint.audioVersion);
    if (highConfidenceMatch) {
        return rejectTrack(track, {
            match: highConfidenceMatch,
            reason: "Fingerprint phát hiện bản ghi âm có độ tương đồng cao với một bài hát đã có.",
        });
    }

    const reviewConfidenceMatch = await findReviewConfidenceMatch(track._id, fingerprint.audioVersion);
    if (reviewConfidenceMatch) {
        track.fingerprintScreening = {
            ...(track.fingerprintScreening?.toObject?.() || track.fingerprintScreening || {}),
            status: "flagged",
            riskLevel: "medium",
            highestSimilarity: Number(reviewConfidenceMatch.similarityScore || 0),
            matchedTrackId: reviewConfidenceMatch.sourceTrackId?.toString() === track._id.toString()
                ? reviewConfidenceMatch.matchedTrackId || null
                : reviewConfidenceMatch.sourceTrackId || null,
            completedAt: new Date(),
        };
        await track.save();
        return { status: "pending_manual_review", riskLevel: "medium", matchId: reviewConfidenceMatch._id };
    }

    // A clean fingerprint only means the automated screen passed. It is not proof
    // of ownership and must never bypass the Admin copyright review gate.
    track.fingerprintScreening = {
        ...(track.fingerprintScreening?.toObject?.() || track.fingerprintScreening || {}),
        status: "passed",
        riskLevel: "none",
        exactDuplicate: false,
        matchedTrackId: null,
        highestSimilarity: 0,
        completedAt: new Date(),
    };
    await track.save();
    return { status: "pending_manual_review", screening: "passed" };
};

export default { evaluateAutomaticTrackModeration };
