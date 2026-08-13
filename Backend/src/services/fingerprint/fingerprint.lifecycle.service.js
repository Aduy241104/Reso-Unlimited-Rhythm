import AudioFingerprint from "../../models/AudioFingerprint.js";
import AudioFingerprintMatch from "../../models/AudioFingerprintMatch.js";
import CopyrightClaim from "../../models/CopyrightClaim.js";
import CopyrightFingerprintBlocklist from "../../models/CopyrightFingerprintBlocklist.js";
import CopyrightRegistry from "../../models/CopyrightRegistry.js";
import TrackModerationReview from "../../models/TrackModerationReview.js";
import { recordAuditEvent } from "../audit/auditLog.service.js";

export const FINGERPRINT_ALGORITHM = "chromaprint";
export const FINGERPRINT_ALGORITHM_VERSION = "chromaprint-v1";

// Documents created before matchingScope existed are active by default. New
// queries use this filter until the maintenance script has backfilled them.
export const activeFingerprintScopeFilter = () => ({
    matchingScope: { $in: ["active", null] },
});

const AUDIO_VERSION_REPLACED_REASON = "Audio version replaced; previous fingerprint state is no longer authoritative.";

/**
 * Invalidate derived audio state after a Track receives a new audio version.
 *
 * The current AudioFingerprint schema intentionally remains one-record-per-
 * track. The record is reset for the new version, while old matches/reviews
 * are retained as historical data and excluded from active matching.
 */
export const invalidateTrackAudioVersionState = async (
    trackId,
    {
        audioVersion = 1,
        submissionVersion = 1,
        reason = AUDIO_VERSION_REPLACED_REASON,
    } = {}
) => {
    if (!trackId) return;

    const now = new Date();
    await Promise.all([
        AudioFingerprint.updateMany(
            {
                trackId,
                ...activeFingerprintScopeFilter(),
            },
            {
                $set: {
                    status: "pending",
                    audioVersion: Number(audioVersion) || 1,
                    rawFingerprint: [],
                    fingerprintHash: "",
                    sourceAudioHash: "",
                    sourceAudioFormat: "",
                    duration: 0,
                    retryCount: 0,
                    lastAttemptAt: null,
                    processingStartedAt: null,
                    generatedAt: null,
                    errorCode: "",
                    error: "",
                },
            }
        ),
        AudioFingerprintMatch.updateMany(
            {
                $and: [
                    {
                        $or: [
                            { sourceTrackId: trackId },
                            { matchedTrackId: trackId },
                        ],
                    },
                    activeFingerprintScopeFilter(),
                ],
            },
            {
                $set: {
                    matchingScope: "historical",
                    retainedAt: now,
                    retentionReason: reason,
                },
            }
        ),
        CopyrightRegistry.updateOne(
            { trackId },
            {
                $set: {
                    "fingerprint.algorithm": "none",
                    "fingerprint.value": "",
                    "fingerprint.algorithmVersion": "",
                    "fingerprint.status": "pending",
                    "fingerprint.sourceAudioHash": "",
                    "fingerprint.duration": 0,
                    "fingerprint.generatedAt": null,
                    externalResult: null,
                    externalSubmissionVersion: Number(submissionVersion) || 1,
                    "externalVerification.mode": "none",
                    "externalVerification.provider": "",
                    "externalVerification.source": "",
                    "externalVerification.status": "",
                    acoustIdResult: null,
                    acoustIdFingerprintHash: "",
                    acoustIdAudioVersion: Number(audioVersion) || 1,
                },
            }
        ),
        TrackModerationReview.updateMany(
            {
                trackId,
                status: "active",
                "versions.audio": { $ne: Number(audioVersion) || 1 },
            },
            {
                $set: {
                    status: "abandoned",
                    completedAt: now,
                },
            }
        ),
    ]);
};

const VIOLATION_FLAGS = new Set([
    "copyright",
    "duplicate_track",
    "missing_rights_proof",
]);

const getViolationFlags = (track) => (
    Array.isArray(track?.moderation?.violationFlags)
        ? track.moderation.violationFlags
        : []
);

const isNeutralAutomaticReturn = (track) => track?.moderation?.automatic?.decision === "auto_reject";

/**
 * Pure policy decision used by deletion and tests. Database-backed claims and
 * matches are checked separately by resolveTrackDeletionDisposition().
 */
export const getTrackDeletionDisposition = (track) => {
    const violationFlags = getViolationFlags(track);
    const hasFingerprintViolation = Boolean(
        track?.fingerprintScreening?.exactDuplicate ||
        violationFlags.some((flag) => VIOLATION_FLAGS.has(flag)) ||
        track?.copyright?.copyrightStatus === "disputed" ||
        (track?.approvalStatus === "rejected" && !isNeutralAutomaticReturn(track))
    );

    if (hasFingerprintViolation) {
        return {
            mode: "retain_enforcement",
            reasonCode: violationFlags.includes("duplicate_track") || track?.fingerprintScreening?.exactDuplicate
                ? "exact_duplicate"
                : "copyright_violation",
            reason: "Copyright/fingerprint violation evidence retained after Track deletion.",
        };
    }

    const isUnsubmittedDraft = track?.approvalStatus === "draft" &&
        !track?.moderation?.submittedAt &&
        track?.pendingUpdate?.status !== "pending" &&
        track?.pendingUpdate?.status !== "rejected";

    if (isUnsubmittedDraft) {
        return {
            mode: "operational_cleanup",
            reasonCode: "policy_violation",
            reason: "Unsubmitted draft deleted; operational fingerprint data can be removed.",
        };
    }

    return {
        mode: "historical",
        reasonCode: "policy_violation",
        reason: "Track moderation history retained without active duplicate participation.",
    };
};

export const resolveTrackDeletionDisposition = async (track) => {
    const initial = getTrackDeletionDisposition(track);
    if (initial.mode !== "historical") return initial;

    const [claim, highRiskMatch] = await Promise.all([
        CopyrightClaim.findOne({
            trackId: track._id,
            $or: [
                { status: { $in: ["submitted", "under_review", "responded", "appealed"] } },
                { status: "resolved", "decision.outcome": "remove_content" },
            ],
        }).select("_id status decision.outcome").lean(),
        AudioFingerprintMatch.findOne({
            $and: [
                { $or: [{ sourceTrackId: track._id }, { matchedTrackId: track._id }] },
                { status: { $in: ["detected", "under_review", "confirmed"] } },
                { $or: [{ matchType: "exact_file_duplicate" }, { severity: "high" }, { riskLevel: "high" }] },
            ],
        }).select("_id matchType severity riskLevel").lean(),
    ]);

    if (claim) {
        return {
            mode: "retain_enforcement",
            reasonCode: claim.status === "resolved" ? "claim_remove_content" : "copyright_violation",
            reason: "Open or decided copyright claim evidence retained after Track deletion.",
            claimId: claim._id,
        };
    }

    if (highRiskMatch) {
        return {
            mode: "retain_enforcement",
            reasonCode: highRiskMatch.matchType === "exact_file_duplicate"
                ? "exact_duplicate"
                : "copyright_violation",
            reason: "High-risk fingerprint evidence retained after Track deletion.",
            matchId: highRiskMatch._id,
        };
    }

    return initial;
};

const getFingerprint = (track) => AudioFingerprint.findOne({
    trackId: track._id,
    algorithm: FINGERPRINT_ALGORITHM,
    algorithmVersion: FINGERPRINT_ALGORITHM_VERSION,
}).lean();

const upsertEnforcementEvidence = async (track, fingerprint, disposition, actorUserId) => {
    const sourceAudioHash = fingerprint?.sourceAudioHash || track?.fingerprintScreening?.audioHash || "";
    if (!sourceAudioHash) return null;

    const query = {
        algorithm: FINGERPRINT_ALGORITHM,
        algorithmVersion: FINGERPRINT_ALGORITHM_VERSION,
        sourceAudioHash,
        status: "active",
    };
    const payload = {
        sourceAudioHash,
        fingerprintHash: fingerprint?.fingerprintHash || "",
        ...(Array.isArray(fingerprint?.rawFingerprint) ? { rawFingerprint: fingerprint.rawFingerprint } : {}),
        duration: Number(fingerprint?.duration || track?.duration || 0),
        reasonCode: disposition.reasonCode,
        reason: disposition.reason,
        retainedAt: new Date(),
        metadata: {
            deletedAt: track.deletedAt || new Date(),
            approvalStatus: track.approvalStatus || "",
            violationFlags: getViolationFlags(track),
            actorUserId: actorUserId || null,
            claimId: disposition.claimId || null,
            matchId: disposition.matchId || null,
        },
    };

    try {
        return await CopyrightFingerprintBlocklist.findOneAndUpdate(
            query,
            {
                $set: payload,
                $setOnInsert: {
                    ...query,
                    sourceTrackId: track._id,
                    sourceArtistId: track.artist_artistId?._id || track.artist_artistId || null,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        if (error?.code !== 11000) throw error;
        return CopyrightFingerprintBlocklist.findOne(query);
    }
};

export const retainTrackFingerprintForEnforcement = async (
    track,
    { reasonCode = "copyright_violation", reason = "Fingerprint enforcement evidence retained.", actorUserId = null, claimId = null, matchId = null } = {}
) => {
    const fingerprint = await getFingerprint(track);
    const disposition = { reasonCode, reason, claimId, matchId };
    const enforcementEvidence = await upsertEnforcementEvidence(track, fingerprint, disposition, actorUserId);
    await AudioFingerprint.updateMany(
        { trackId: track._id },
        {
            $set: {
                matchingScope: "enforcement",
                retainedAt: new Date(),
                retentionReason: reason,
            },
        }
    );
    await AudioFingerprintMatch.updateMany(
        { $or: [{ sourceTrackId: track._id }, { matchedTrackId: track._id }] },
        { $set: { matchingScope: "enforcement", retainedAt: new Date(), retentionReason: reason } }
    );
    return { fingerprint, enforcementEvidence };
};

export const cleanupTrackFingerprintLifecycle = async (track, { actorUserId = null } = {}) => {
    const disposition = await resolveTrackDeletionDisposition(track);
    const fingerprint = await getFingerprint(track);
    let enforcementEvidence = null;

    if (disposition.mode === "retain_enforcement") {
        const retained = await retainTrackFingerprintForEnforcement(track, {
            reasonCode: disposition.reasonCode,
            reason: disposition.reason,
            actorUserId,
            claimId: disposition.claimId,
            matchId: disposition.matchId,
        });
        enforcementEvidence = retained.enforcementEvidence;
        if (fingerprint?.status !== "completed") {
            await AudioFingerprint.updateMany(
                { trackId: track._id },
                { $set: { status: "unavailable", processingStartedAt: null, errorCode: "track_deleted_retained_evidence" } }
            );
        }
    } else if (disposition.mode === "operational_cleanup") {
        await Promise.all([
            AudioFingerprint.deleteMany({ trackId: track._id }),
            AudioFingerprintMatch.deleteMany({
                $or: [{ sourceTrackId: track._id }, { matchedTrackId: track._id }],
            }),
            CopyrightRegistry.deleteMany({ trackId: track._id }),
        ]);
    } else {
        await AudioFingerprint.updateMany(
            { trackId: track._id },
            {
                $set: {
                    matchingScope: "historical",
                    retainedAt: new Date(),
                    retentionReason: disposition.reason,
                },
            }
        );
        await AudioFingerprintMatch.updateMany(
            { $or: [{ sourceTrackId: track._id }, { matchedTrackId: track._id }] },
            { $set: { matchingScope: "historical", retainedAt: new Date(), retentionReason: disposition.reason } }
        );
    }

    await TrackModerationReview.updateMany(
        { trackId: track._id, status: "active" },
        { $set: { status: "abandoned" } }
    );

    void recordAuditEvent({
        actorUserId,
        action: "TRACK_FINGERPRINT_LIFECYCLE_CLEANUP",
        targetType: "track",
        targetId: track._id,
        metadata: {
            mode: disposition.mode,
            reasonCode: disposition.reasonCode,
            sourceAudioHash: fingerprint?.sourceAudioHash ? `${fingerprint.sourceAudioHash.slice(0, 12)}…` : "",
            enforcementEvidenceId: enforcementEvidence?._id || null,
        },
    }).catch((error) => console.error("Fingerprint lifecycle audit failed:", error.message));

    return {
        ...disposition,
        fingerprintDeleted: disposition.mode === "operational_cleanup",
        enforcementEvidenceId: enforcementEvidence?._id || null,
    };
};

export default {
    activeFingerprintScopeFilter,
    invalidateTrackAudioVersionState,
    getTrackDeletionDisposition,
    resolveTrackDeletionDisposition,
    cleanupTrackFingerprintLifecycle,
    retainTrackFingerprintForEnforcement,
};
