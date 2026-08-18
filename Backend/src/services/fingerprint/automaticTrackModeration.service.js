import mongoose from "mongoose";
import AudioFingerprint from "../../models/AudioFingerprint.js";
import AudioFingerprintMatch from "../../models/AudioFingerprintMatch.js";
import CopyrightFingerprintBlocklist from "../../models/CopyrightFingerprintBlocklist.js";
import CopyrightRegistry from "../../models/CopyrightRegistry.js";
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
import {
    evaluateModerationDecision,
    getAutomaticRejectionReason,
    getCandidateContext,
    isDuplicateAutomaticRejection,
    isPerfectFingerprintMatch,
    isSameTitleAudioDuplicate,
    MODERATION_DECISIONS,
} from "./moderationDecision.service.js";

const isEnabled = () => process.env.FINGERPRINT_AUTO_MODERATION !== "false";
const isValidTrackId = (trackId) => mongoose.Types.ObjectId.isValid(trackId);
const evaluationInFlight = new Map();

const getTarget = (track) => (
    track?.pendingUpdate?.status === "pending" && track.pendingUpdate.data
        ? track.pendingUpdate.data
        : track
);

const getTargetVersions = (track) => {
    const pending = track?.pendingUpdate?.status === "pending" && track.pendingUpdate.data;
    return {
        audioVersion: Number(pending ? track.pendingUpdate.audioVersion : track.audioVersion) || 1,
        submissionVersion: Number(pending ? track.pendingUpdate.submissionVersion : track.submissionVersion) || 1,
        copyrightVersion: Number(pending ? track.pendingUpdate.copyrightVersion : track.copyrightVersion) || 1,
        evidenceVersion: Number(pending ? track.pendingUpdate.evidenceVersion : track.evidenceVersion) || 1,
    };
};

const normalizeTitleForComparison = (value) => String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi-VN");

const getModerationTitle = (track) => {
    const target = getTarget(track);
    return target?.title || track?.title || "";
};

const getSameArtistTitleAudioMatch = (track, matchResult) => {
    const candidate = matchResult?.candidateTrack;
    if (!candidate || getCandidateContext(candidate) !== "approved_active") return null;

    const sameArtist = String(track?.artist_artistId || "") === String(candidate?.artist_artistId || "");
    const sameTitle = normalizeTitleForComparison(getModerationTitle(track)) ===
        normalizeTitleForComparison(getModerationTitle(candidate));
    if (!sameArtist || !sameTitle || !isSameTitleAudioDuplicate(matchResult.match)) return null;

    return matchResult;
};

const isCurrentModerationVersion = async (track, versions, { requirePending = true, pendingUpdate = null } = {}) => {
    const isPendingUpdate = pendingUpdate === null
        ? track?.pendingUpdate?.status === "pending"
        : pendingUpdate;
    const versionFilter = isPendingUpdate
        ? {
            ...(requirePending ? { "pendingUpdate.status": "pending" } : {}),
            "pendingUpdate.audioVersion": versions.audioVersion,
            "pendingUpdate.submissionVersion": versions.submissionVersion,
            "pendingUpdate.copyrightVersion": versions.copyrightVersion,
            "pendingUpdate.evidenceVersion": versions.evidenceVersion,
        }
        : {
            ...(requirePending ? { approvalStatus: "pending" } : {}),
            audioVersion: versions.audioVersion,
            submissionVersion: versions.submissionVersion,
            copyrightVersion: versions.copyrightVersion,
            evidenceVersion: versions.evidenceVersion,
        };
    return Boolean(await Track.exists({
        _id: track._id,
        isDeleted: { $ne: true },
        ...versionFilter,
    }));
};

const getArtistForNotification = async (track) => {
    if (!track?.artist_artistId) return null;
    return Artist.findById(track.artist_artistId).select("_id userId name").lean();
};

const notifyArtist = async ({ track, artist, status, note }) => {
    if (!artist?.userId) return;
    const approved = status === "approved";
    const notification = await Notification.create({
        userId: artist.userId,
        type: "system",
        title: approved
            ? `Track "${track.title}" cleared for admin review`
            : `Track "${track.title}" needs changes before review`,
        content: approved
            ? "Automatic moderation found no high-confidence ownership conflict. An admin still needs to approve publication."
            : String(note || "The current submission needs more information before it can be reviewed."),
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
        // Persisted notification is sufficient when Socket.IO is unavailable.
    }
};

const getModerationObject = (track) => track.moderation?.toObject?.() || track.moderation || {};

const setAutomaticDecision = (track, decision, versions, providerStatus = null) => {
    track.set("moderation.automatic", {
        decision: decision.decision,
        priority: decision.priority,
        reasonCodes: decision.reasonCodes,
        riskLevel: decision.riskLevel || "none",
        summary: decision.summary,
        evaluatedAt: new Date(),
        audioVersion: versions.audioVersion,
        submissionVersion: versions.submissionVersion,
        copyrightVersion: versions.copyrightVersion,
        evidenceVersion: versions.evidenceVersion,
        providerStatus,
    });
};

const setScreening = (track, values = {}) => {
    track.fingerprintScreening = {
        ...(track.fingerprintScreening?.toObject?.() || track.fingerprintScreening || {}),
        ...values,
        audioVersion: Number(values.audioVersion || track.fingerprintScreening?.audioVersion || track.audioVersion || 1),
        completedAt: values.completedAt || new Date(),
    };
};

const getOtherTrackId = (match, trackId) => {
    if (!match) return null;
    return String(match.sourceTrackId) === String(trackId)
        ? match.matchedTrackId
        : match.sourceTrackId;
};

const isOwnDraftCandidate = (sourceTrack, candidateTrack) => (
    getCandidateContext(candidateTrack) === "draft" &&
    String(sourceTrack?.artist_artistId || "") === String(candidateTrack?.artist_artistId || "")
);

const getExactCandidatePriority = (candidateTrack) => {
    switch (getCandidateContext(candidateTrack)) {
        // An already-approved active recording is conclusive evidence for an
        // automatic duplicate rejection. A pending A/B upload is still
        // reviewable, but must not hide an approved duplicate when both are
        // present in the fingerprint catalog.
        case "approved_active": return 50;
        case "pending": return 40;
        case "draft": return 20;
        case "historical_deleted": return 5;
        default: return 0;
    }
};

const findExactDuplicate = async (track, sourceAudioHash) => {
    if (!sourceAudioHash) return null;

    const candidates = await AudioFingerprint.find({
        trackId: { $ne: track._id },
        algorithm: "chromaprint",
        algorithmVersion: "chromaprint-v1",
        status: "completed",
        matchingScope: { $in: ["active", "historical", null] },
        sourceAudioHash,
    }).sort({ updatedAt: -1 }).limit(100).lean();

    if (!candidates.length) return null;
    const candidateTracks = await Track.find({
        _id: { $in: candidates.map((candidate) => candidate.trackId) },
    }).select("_id artist_artistId approvalStatus activeStatus pendingUpdate isDeleted").lean();
    const trackMap = new Map(candidateTracks.map((candidate) => [String(candidate._id), candidate]));

    const ranked = candidates
        .map((fingerprint) => {
            const candidateTrack = trackMap.get(String(fingerprint.trackId)) || null;
            return {
                fingerprint,
                candidateTrack,
                candidateContext: getCandidateContext(candidateTrack),
                sameArtist: Boolean(
                    candidateTrack &&
                    String(track.artist_artistId || "") === String(candidateTrack.artist_artistId || "")
                ),
            };
        })
        .filter(({ candidateTrack }) => Boolean(candidateTrack))
        .sort((left, right) => getExactCandidatePriority(right.candidateTrack) - getExactCandidatePriority(left.candidateTrack));

    return ranked[0] || null;
};

const findConfirmedEnforcementEvidence = async (sourceAudioHash) => {
    if (!sourceAudioHash) return null;
    return CopyrightFingerprintBlocklist.findOne({
        algorithm: "chromaprint",
        algorithmVersion: "chromaprint-v1",
        sourceAudioHash,
        status: "active",
    }).sort({ createdAt: 1 }).lean();
};

const findEligibleMatch = async ({ track, query, sort }) => {
    const matches = await AudioFingerprintMatch.find(query).sort(sort).limit(50).lean();
    for (const match of matches) {
        const otherTrackId = getOtherTrackId(match, track._id);
        if (!otherTrackId) continue;
        const candidateTrack = await Track.findById(otherTrackId)
            .select("_id title artist_artistId approvalStatus activeStatus pendingUpdate isDeleted")
            .lean();
        if (!candidateTrack || getCandidateContext(candidateTrack) === "historical_deleted") continue;
        if (isOwnDraftCandidate(track, candidateTrack)) continue;
        return { match, candidateTrack };
    }
    return null;
};

const findHighConfidenceMatch = async (track, audioVersion) => findEligibleMatch({
    track,
    query: {
        $and: [
            { status: { $in: ["detected", "under_review", "confirmed"] } },
            { matchingScope: { $in: ["active", null] } },
            { matchType: "chromaprint" },
            {
                $or: [
                    { sourceTrackId: track._id, $or: [{ sourceAudioVersion: audioVersion }, { sourceAudioVersion: null }] },
                    { matchedTrackId: track._id, $or: [{ matchedAudioVersion: audioVersion }, { matchedAudioVersion: null }] },
                ],
            },
            { $or: [{ severity: "high" }, { riskLevel: "high" }] },
        ],
    },
    sort: { similarityScore: -1, createdAt: -1 },
});

const findReviewConfidenceMatch = async (track, audioVersion) => findEligibleMatch({
    track,
    query: {
        $and: [
            { status: { $in: ["detected", "under_review", "confirmed"] } },
            { matchingScope: { $in: ["active", null] } },
            { matchType: "chromaprint" },
            {
                $or: [
                    { sourceTrackId: track._id, $or: [{ sourceAudioVersion: audioVersion }, { sourceAudioVersion: null }] },
                    { matchedTrackId: track._id, $or: [{ matchedAudioVersion: audioVersion }, { matchedAudioVersion: null }] },
                ],
            },
            { $or: [{ severity: "review" }, { riskLevel: "medium" }] },
        ],
    },
    sort: { similarityScore: -1, createdAt: -1 },
});

const isProviderResultCurrent = (provider, versions) => provider &&
    provider.status &&
    Number(provider.audioVersion || 1) === Number(versions.audioVersion || 1) &&
    Number(provider.submissionVersion || 1) === Number(versions.submissionVersion || 1) &&
    Number(provider.copyrightVersion || 1) === Number(versions.copyrightVersion || 1) &&
    Number(provider.evidenceVersion || 1) === Number(versions.evidenceVersion || 1);

const getProviderResults = async (trackId, versions) => {
    const registry = await CopyrightRegistry.findOne({ trackId })
        .select("acoustIdResult externalResult")
        .lean();
    return {
        acoustId: isProviderResultCurrent(registry?.acoustIdResult, versions)
            ? registry.acoustIdResult
            : null,
        musicBrainz: isProviderResultCurrent(registry?.externalResult, versions)
            ? registry.externalResult
            : null,
    };
};

const getProviderStatus = ({ acoustId, musicBrainz }) => ({
    acoustId: acoustId?.status || "unavailable",
    musicBrainz: musicBrainz?.status || "unavailable",
});

const getContentValidity = (target) => ({
    audioValid: Boolean(
        Number(target?.duration || 0) > 0 &&
        Array.isArray(target?.audioFiles) &&
        target.audioFiles.some((file) => file?.label === "original" && String(file?.url || "").trim())
    ),
    metadataValid: Boolean(String(target?.title || "").trim() && Number(target?.duration || 0) > 0),
});

const getCandidateForDecision = (exactDuplicate) => exactDuplicate
    ? {
        candidateTrack: exactDuplicate.candidateTrack,
        candidateContext: exactDuplicate.candidateContext,
        sameArtist: exactDuplicate.sameArtist,
    }
    : null;

const getPerfectCandidateForDecision = (track, matchResult) => {
    if (!isPerfectFingerprintMatch(matchResult?.match)) return null;
    const candidateTrack = matchResult.candidateTrack;
    return {
        candidateTrack,
        candidateContext: getCandidateContext(candidateTrack),
        sameArtist: Boolean(
            candidateTrack &&
            String(track.artist_artistId || "") === String(candidateTrack.artist_artistId || "")
        ),
    };
};

const getMatchedTrackId = (track, match, candidateTrack = null) => (
    candidateTrack?._id || getOtherTrackId(match, track._id) || null
);

const buildManualScreening = (track, versions, match, candidateTrack, riskLevel = "medium", exactDuplicate = false) => {
    setScreening(track, {
        status: "flagged",
        audioVersion: versions.audioVersion,
        riskLevel,
        exactDuplicate,
        highestSimilarity: exactDuplicate ? 1 : Number(match?.similarityScore || 0),
        matchedTrackId: getMatchedTrackId(track, match, candidateTrack),
        enforcementEvidenceId: null,
        failureReason: "",
    });
};

const returnSubmissionToArtist = async (track, decision, versions) => {
    if (!await isCurrentModerationVersion(track, versions)) {
        return { status: "skipped", reason: "stale_audio_version" };
    }
    const targetIsPendingUpdate = track.pendingUpdate?.status === "pending";
    const rejectionReason = getAutomaticRejectionReason(decision);
    const isDuplicateRejection = isDuplicateAutomaticRejection(decision);
    if (targetIsPendingUpdate) {
        track.pendingUpdate.status = "rejected";
        track.pendingUpdate.reviewedBy = null;
        track.pendingUpdate.reviewedAt = new Date();
        track.pendingUpdate.adminNote = rejectionReason;
        track.pendingUpdate.rejectReason = rejectionReason;
    } else {
        // Use the existing content workflow state only to return a release to
        // the artist. The automatic decision itself stays in moderation.automatic.
        track.approvalStatus = "rejected";
        track.activeStatus = "draft";
        track.rejectReason = rejectionReason;
    }
    track.moderation = {
        ...getModerationObject(track),
        reviewedBy: null,
        reviewedAt: new Date(),
        adminNote: rejectionReason,
        violationFlags: isDuplicateRejection ? ["copyright", "duplicate_track"] : [],
    };
    setScreening(track, {
        status: isDuplicateRejection ? "flagged" : "passed",
        audioVersion: versions.audioVersion,
        riskLevel: isDuplicateRejection ? "high" : "none",
        exactDuplicate: isDuplicateRejection,
        matchedTrackId: null,
        enforcementEvidenceId: null,
        highestSimilarity: isDuplicateRejection ? 1 : 0,
        failureReason: isDuplicateRejection ? "automatic_duplicate_rejection" : "",
    });
    if (!await isCurrentModerationVersion(track, versions, { requirePending: false, pendingUpdate: targetIsPendingUpdate })) {
        return { status: "skipped", reason: "stale_audio_version" };
    }
    await track.save();
    void recordAuditEvent({
        action: "TRACK_AUTO_RETURNED_TO_ARTIST",
        targetType: "track",
        targetId: track._id,
        metadata: {
            source: "automatic_moderation",
            decision: decision.decision,
            reasonCodes: decision.reasonCodes,
            audioVersion: versions.audioVersion,
            submissionVersion: versions.submissionVersion,
        },
    }).catch((error) => console.error("Automatic moderation audit failed:", error.message));
    const artist = await getArtistForNotification(track);
    await notifyArtist({ track, artist, status: "rejected", note: rejectionReason });
    return { status: decision.decision, decision: decision.decision, reasonCodes: decision.reasonCodes };
};

const applyEnforcementBlock = async (track, decision, versions, enforcementEvidence, match = null) => {
    if (!await isCurrentModerationVersion(track, versions)) {
        return { status: "skipped", reason: "stale_audio_version" };
    }
    const targetIsPendingUpdate = track.pendingUpdate?.status === "pending";
    const reason = "Bản ghi âm trùng với fingerprint enforcement/blocklist đã được xác nhận.";
    track.activeStatus = "blocked";
    track.rejectReason = reason;
    if (targetIsPendingUpdate) {
        track.pendingUpdate.status = "rejected";
        track.pendingUpdate.reviewedBy = null;
        track.pendingUpdate.reviewedAt = new Date();
        track.pendingUpdate.adminNote = reason;
        track.pendingUpdate.rejectReason = reason;
    }
    track.moderation = {
        ...getModerationObject(track),
        reviewedBy: null,
        reviewedAt: new Date(),
        adminNote: reason,
        violationFlags: ["copyright"],
    };
    if (track.copyright) track.copyright.copyrightStatus = "disputed";
    const retained = await retainTrackFingerprintForEnforcement(track, {
        reasonCode: enforcementEvidence?.reasonCode || "copyright_violation",
        reason,
        matchId: match?._id || null,
    });
    setScreening(track, {
        status: "flagged",
        audioVersion: versions.audioVersion,
        exactDuplicate: true,
        riskLevel: "high",
        matchedTrackId: getMatchedTrackId(track, match),
        enforcementEvidenceId: retained?.enforcementEvidence?._id || enforcementEvidence?._id || null,
        highestSimilarity: 1,
        failureReason: "confirmed_enforcement_block",
    });
    if (!await isCurrentModerationVersion(track, versions, { requirePending: false, pendingUpdate: targetIsPendingUpdate })) {
        return { status: "skipped", reason: "stale_audio_version" };
    }
    await track.save();
    void recordAuditEvent({
        action: "TRACK_ENFORCEMENT_BLOCKED",
        targetType: "track",
        targetId: track._id,
        metadata: {
            source: "automatic_moderation",
            decision: decision.decision,
            reasonCodes: decision.reasonCodes,
            enforcementEvidenceId: enforcementEvidence?._id || null,
            audioVersion: versions.audioVersion,
            submissionVersion: versions.submissionVersion,
        },
    }).catch((error) => console.error("Enforcement block audit failed:", error.message));
    const artist = await getArtistForNotification(track);
    await notifyArtist({ track, artist, status: "rejected", note: reason });
    return {
        status: decision.decision,
        decision: decision.decision,
        reasonCodes: decision.reasonCodes,
        enforcementEvidenceId: enforcementEvidence?._id || null,
    };
};

const evaluateAutomaticTrackModerationOnce = async (trackId, { force = false } = {}) => {
    if (!isEnabled() || !isValidTrackId(trackId)) return { status: "skipped" };

    const track = await Track.findOne({
        _id: trackId,
        isDeleted: { $ne: true },
        $or: [{ approvalStatus: "pending" }, { "pendingUpdate.status": "pending" }],
    });
    if (!track) return { status: "not_pending" };

    const target = getTarget(track);
    const versions = getTargetVersions(track);
    const fingerprint = await AudioFingerprint.findOne({
        trackId: track._id,
        algorithm: "chromaprint",
        algorithmVersion: "chromaprint-v1",
        ...activeFingerprintScopeFilter(),
    }).lean();
    if (
        !fingerprint ||
        fingerprint.status !== "completed" ||
        Number(fingerprint.audioVersion || 0) !== versions.audioVersion
    ) {
        return { status: "pending_fingerprint", audioVersion: versions.audioVersion };
    }

    const enforcementEvidence = await findConfirmedEnforcementEvidence(fingerprint.sourceAudioHash || "");
    const exactDuplicate = await findExactDuplicate(track, fingerprint.sourceAudioHash || "");
    let exactMatch = null;
    const highMatch = await findHighConfidenceMatch(track, versions.audioVersion);
    const reviewMatch = await findReviewConfidenceMatch(track, versions.audioVersion);
    const perfectCandidate = getPerfectCandidateForDecision(track, highMatch || reviewMatch);
    const sameArtistTitleMatch = getSameArtistTitleAudioMatch(track, highMatch);
    const providers = await getProviderResults(track._id, versions);
    const decision = evaluateModerationDecision({
        fingerprint: { status: fingerprint.status, complete: true },
        content: getContentValidity(target),
        copyright: target?.copyright || {},
        exactCandidate: getCandidateForDecision(exactDuplicate),
        perfectCandidate,
        sameArtistTitleMatch,
        highMatch,
        reviewMatch,
        acoustId: providers.acoustId,
        musicBrainz: providers.musicBrainz,
        enforcementEvidence,
    });
    const providerStatus = getProviderStatus(providers);
    setAutomaticDecision(track, decision, versions, providerStatus);

    if (decision.decision === MODERATION_DECISIONS.ENFORCEMENT_BLOCK) {
        return applyEnforcementBlock(track, decision, versions, enforcementEvidence, exactMatch);
    }
    if (decision.decision === MODERATION_DECISIONS.AUTO_REJECT) {
        return returnSubmissionToArtist(track, decision, versions);
    }

    if (decision.decision === MODERATION_DECISIONS.MANUAL_REVIEW_HIGH) {
        // Persist an internal exact-match record only when policy actually
        // sends the case to manual review. AUTO_REJECT must not create an
        // enforcement-like match that could later be retained on deletion.
        if (exactDuplicate && exactDuplicate.candidateContext !== "historical_deleted" && exactDuplicate.candidateContext !== "draft") {
            exactMatch = await recordExactFileDuplicateMatch({
                sourceTrackId: track._id,
                matchedTrackId: exactDuplicate.fingerprint.trackId,
                sourceAudioVersion: versions.audioVersion,
                matchedAudioVersion: exactDuplicate.fingerprint.audioVersion,
            });
        }
        buildManualScreening(track, versions, exactMatch, exactDuplicate?.candidateTrack, "high", Boolean(exactDuplicate));
    } else if (decision.decision === MODERATION_DECISIONS.MANUAL_REVIEW) {
        buildManualScreening(track, versions, highMatch?.match || reviewMatch?.match, highMatch?.candidateTrack || reviewMatch?.candidateTrack, "medium", false);
    } else {
        setScreening(track, {
            status: "passed",
            audioVersion: versions.audioVersion,
            riskLevel: "none",
            exactDuplicate: false,
            matchedTrackId: null,
            enforcementEvidenceId: null,
            highestSimilarity: 0,
            failureReason: "",
        });
    }

    if (!await isCurrentModerationVersion(track, versions)) {
        return { status: "skipped", reason: "stale_audio_version" };
    }
    await track.save();
    void recordAuditEvent({
        action: "TRACK_AUTOMATIC_MODERATION_DECIDED",
        targetType: "track",
        targetId: track._id,
        metadata: {
            source: "automatic_moderation",
            decision: decision.decision,
            priority: decision.priority,
            reasonCodes: decision.reasonCodes,
            providerStatus,
            audioVersion: versions.audioVersion,
            submissionVersion: versions.submissionVersion,
        },
    }).catch((error) => console.error("Automatic moderation audit failed:", error.message));
    return {
        status: decision.decision,
        decision: decision.decision,
        priority: decision.priority,
        reasonCodes: decision.reasonCodes,
        screening: track.fingerprintScreening?.status || "unknown",
    };
};

export const evaluateAutomaticTrackModeration = async (trackId, options = {}) => {
    if (!isEnabled() || !isValidTrackId(trackId)) return { status: "skipped" };
    const key = String(trackId);
    const running = evaluationInFlight.get(key);
    if (running) return running;
    const operation = evaluateAutomaticTrackModerationOnce(trackId, options)
        .finally(() => evaluationInFlight.delete(key));
    evaluationInFlight.set(key, operation);
    return operation;
};

export default { evaluateAutomaticTrackModeration };
