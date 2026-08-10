import mongoose from "mongoose";
import AudioFingerprint from "../../models/AudioFingerprint.js";
import CopyrightRegistry from "../../models/CopyrightRegistry.js";
import Track from "../../models/Track.js";
import {
    fingerprintAudioSource,
    getFingerprintEngineStatus,
    sanitizeFingerprintError,
} from "./audioFingerprint.service.js";
import { rebuildMatchesForTrack } from "./audioFingerprint.matching.service.js";
import { evaluateAutomaticTrackModeration } from "./automaticTrackModeration.service.js";
import { runMusicBrainzVerification } from "../external/musicbrainz.service.js";
import { runAcoustIdVerification } from "../external/acoustid.service.js";

const ALGORITHM = "chromaprint";
const ALGORITHM_VERSION = "chromaprint-v1";
const MAX_AUTOMATIC_RETRIES = 3;
const PROCESSING_STALE_MS = 10 * 60 * 1000;

const getOriginalAudio = (track) => {
    const files = Array.isArray(track?.audioFiles) ? track.audioFiles : [];
    return files.find((file) => file?.label === "original") || files[0] || null;
};

const buildRegistryPayload = (track, fingerprint) => ({
    rightsOwner: track?.copyright?.copyrightOwner || "",
    recording: {
        recordingId: track?.copyright?.recordingId || "",
        title: track?.title || "",
        owner: track?.copyright?.recordingOwner || "",
        isrc: track?.copyright?.isrc || "",
    },
    musicalWork: {
        iswc: track?.copyright?.iswc || "",
        composer: track?.copyright?.composer || "",
        lyricist: track?.copyright?.lyricist || "",
    },
    fingerprint: {
        algorithm: fingerprint?.algorithm || "none",
        value: fingerprint?.fingerprintHash || "",
        algorithmVersion: fingerprint?.algorithmVersion || ALGORITHM_VERSION,
        status: fingerprint?.status || "completed",
        sourceAudioHash: fingerprint?.sourceAudioHash || "",
        duration: Number(fingerprint?.duration || 0),
        generatedAt: fingerprint?.generatedAt || new Date(),
    },
});

const upsertCopyrightRegistry = async (track, fingerprint) => {
    const query = { trackId: track._id };
    const update = {
        $set: buildRegistryPayload(track, fingerprint),
        $setOnInsert: { trackId: track._id },
    };
    try {
        return await CopyrightRegistry.findOneAndUpdate(
            query,
            update,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        if (error?.code !== 11000) throw error;
        return CopyrightRegistry.findOne(query);
    }
};

const ensureFingerprintRecord = async (trackId, sourceAudioHash = "", audioVersion = 1) => {
    const query = { trackId, algorithm: ALGORITHM, algorithmVersion: ALGORITHM_VERSION };
    try {
        return await AudioFingerprint.findOneAndUpdate(
            query,
            {
                $set: {
                    audioVersion,
                    ...(sourceAudioHash ? { sourceAudioHash } : {}),
                },
                $setOnInsert: {
                    trackId,
                    algorithm: ALGORITHM,
                    algorithmVersion: ALGORITHM_VERSION,
                    matchingScope: "active",
                    status: "pending",
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        // Two workers can initialize the same record at the same time. The
        // unique index is expected to reject one of them; reuse the winner
        // instead of surfacing a misleading 409 to the artist.
        if (error?.code !== 11000) throw error;
        return AudioFingerprint.findOne(query);
    }
};

const markFingerprintUnavailable = async (recordId, errorCode, error) =>
    AudioFingerprint.updateOne(
        { _id: recordId },
        {
            $set: {
                status: "unavailable",
                errorCode: errorCode || "engine_unavailable",
                error: String(error || "Fingerprint engine unavailable").slice(0, 500),
                processingStartedAt: null,
                lastAttemptAt: new Date(),
            },
        }
    );

const discardActiveFingerprintIfTrackDeleted = async (trackId, fingerprintId) => {
    const active = await Track.exists({ _id: trackId, isDeleted: { $ne: true } });
    if (active) return false;
    await AudioFingerprint.deleteOne({ _id: fingerprintId, matchingScope: "active" });
    return true;
};

export const processTrackAudioFingerprint = async (
    trackId,
    { force = false, sourceAudioHash = "", sourceAudio = null, audioVersion = null } = {}
) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) {
        return { status: "skipped", reason: "invalid_track_id" };
    }

    const track = await Track.findOne({ _id: trackId, isDeleted: { $ne: true } }).lean();
    if (!track) return { status: "skipped", reason: "track_deleted_or_not_found" };

    const selectedAudio = sourceAudio || getOriginalAudio(track);
    const selectedAudioVersion = Number(audioVersion || track.audioVersion || 1);
    if (!selectedAudio?.url) {
        const record = await ensureFingerprintRecord(track._id, sourceAudioHash, selectedAudioVersion);
        if (await discardActiveFingerprintIfTrackDeleted(track._id, record._id)) {
            return { status: "skipped", reason: "track_deleted_during_initialization" };
        }
        await markFingerprintUnavailable(record._id, "source_audio_missing", "Track has no original audio source.");
        await Track.updateOne({ _id: track._id, isDeleted: { $ne: true } }, {
            $set: {
                "fingerprintScreening.status": "failed",
                "fingerprintScreening.audioVersion": selectedAudioVersion,
                "fingerprintScreening.failureReason": "source_audio_missing",
            },
        });
        return { status: "unavailable", reason: "source_audio_missing" };
    }

    const previous = await AudioFingerprint.findOne({
        trackId: track._id,
        algorithm: ALGORITHM,
        algorithmVersion: ALGORITHM_VERSION,
    }).select("sourceAudioHash status retryCount audioVersion").lean();
    const existing = await ensureFingerprintRecord(track._id, sourceAudioHash, selectedAudioVersion);
    if (await discardActiveFingerprintIfTrackDeleted(track._id, existing._id)) {
        return { status: "skipped", reason: "track_deleted_during_initialization" };
    }
    const sourceChanged = Boolean(
        sourceAudioHash &&
        previous?.sourceAudioHash &&
        sourceAudioHash !== previous.sourceAudioHash
    );
    const audioVersionChanged = Number(previous?.audioVersion || 1) !== selectedAudioVersion;
    if (!force && existing.status === "completed" && existing.sourceAudioHash && !sourceChanged && !audioVersionChanged) {
        return { status: "completed", fingerprintId: existing._id, reused: true };
    }

    if (!force && existing.status === "failed" && existing.retryCount >= MAX_AUTOMATIC_RETRIES) {
        return { status: "failed", fingerprintId: existing._id, retryExhausted: true };
    }

    const now = new Date();
    const staleBefore = new Date(Date.now() - PROCESSING_STALE_MS);
    const claimed = await AudioFingerprint.findOneAndUpdate(
        {
            _id: existing._id,
            $or: [
                { status: { $in: ["pending", "failed", "unavailable"] } },
                ...(sourceChanged || audioVersionChanged ? [{ status: "completed" }] : []),
                { status: "processing", processingStartedAt: { $lt: staleBefore } },
            ],
            ...(force || sourceChanged || audioVersionChanged ? {} : { retryCount: { $lt: MAX_AUTOMATIC_RETRIES } }),
        },
        {
            $set: {
                status: "processing",
                processingStartedAt: now,
                lastAttemptAt: now,
                errorCode: "",
                error: "",
            },
            $inc: { retryCount: 1 },
        },
        { new: true }
    );

    if (!claimed) return { status: "processing", fingerprintId: existing._id, alreadyRunning: true };

    await Track.updateOne({ _id: track._id, isDeleted: { $ne: true } }, {
        $set: {
            "fingerprintScreening.status": "processing",
            "fingerprintScreening.audioVersion": selectedAudioVersion,
            "fingerprintScreening.audioHash": sourceAudioHash || existing.sourceAudioHash || "",
            "fingerprintScreening.failureReason": "",
        },
    });

    if (process.env.FINGERPRINT_ENABLED === "false") {
        await markFingerprintUnavailable(claimed._id, "engine_disabled", "Fingerprint engine is disabled.");
        await Track.updateOne({ _id: track._id, isDeleted: { $ne: true } }, {
            $set: {
                "fingerprintScreening.status": "failed",
                "fingerprintScreening.failureReason": "engine_disabled",
            },
        });
        return { status: "unavailable", fingerprintId: claimed._id };
    }

    const engine = await getFingerprintEngineStatus();
    if (!engine.available) {
        await markFingerprintUnavailable(claimed._id, engine.errorCode, "Fingerprint engine is unavailable.");
        await Track.updateOne({ _id: track._id, isDeleted: { $ne: true } }, {
            $set: {
                "fingerprintScreening.status": "failed",
                "fingerprintScreening.failureReason": engine.errorCode || "engine_unavailable",
            },
        });
        return { status: "unavailable", fingerprintId: claimed._id };
    }

    try {
        const fingerprint = await fingerprintAudioSource({
            sourceUrl: selectedAudio.url,
            expectedSourceAudioHash: sourceAudioHash || "",
        });
        const generatedAt = new Date();

        const completed = await AudioFingerprint.findOneAndUpdate(
            { _id: claimed._id, status: "processing" },
            {
                $set: {
                    ...fingerprint,
                    status: "completed",
                    generatedAt,
                    processingStartedAt: null,
                    errorCode: "",
                    error: "",
                },
            },
            { new: true }
        );

        if (completed) {
            const stillActive = await Track.exists({ _id: track._id, isDeleted: { $ne: true } });
            if (!stillActive) {
                await AudioFingerprint.deleteOne({ _id: claimed._id, matchingScope: "active" });
                return { status: "skipped", reason: "track_deleted_during_processing" };
            }

            await Track.updateOne({ _id: track._id, isDeleted: { $ne: true } }, {
                $set: {
                    "fingerprintScreening.status": "passed",
                    "fingerprintScreening.audioVersion": selectedAudioVersion,
                    "fingerprintScreening.audioHash": fingerprint.sourceAudioHash || sourceAudioHash || "",
                    "fingerprintScreening.fingerprintId": completed._id,
                    "fingerprintScreening.failureReason": "",
                    "fingerprintScreening.completedAt": generatedAt,
                },
            });
            if (await discardActiveFingerprintIfTrackDeleted(track._id, completed._id)) {
                return { status: "skipped", reason: "track_deleted_after_processing" };
            }
            await upsertCopyrightRegistry(track, { ...fingerprint, status: "completed", generatedAt });
            await rebuildMatchesForTrack(track._id);

            try {
                await evaluateAutomaticTrackModeration(track._id, { fingerprintReady: true });
            } catch (moderationError) {
                console.error("Automatic track moderation failed:", moderationError.message);
            }

            // MusicBrainz is a bounded metadata reference check. It never
            // changes copyright ownership or approval status automatically.
            void runMusicBrainzVerification(track._id).catch((musicBrainzError) => {
                console.error("MusicBrainz verification failed:", musicBrainzError.message);
            });
            void runAcoustIdVerification(track._id).catch((acoustIdError) => {
                console.error("AcoustID verification failed:", acoustIdError.message);
            });
        }

        return { status: "completed", fingerprintId: claimed._id, fingerprintHash: fingerprint.fingerprintHash };
    } catch (error) {
        const errorCode = error?.code || "fingerprint_failed";
        const unavailableCodes = new Set(["ENOENT", "engine_unavailable", "source_not_allowed"]);
        await AudioFingerprint.updateOne(
            { _id: claimed._id, status: "processing" },
            {
                $set: {
                    status: unavailableCodes.has(errorCode) ? "unavailable" : "failed",
                    errorCode,
                    error: sanitizeFingerprintError(error).slice(0, 500),
                    processingStartedAt: null,
                    lastAttemptAt: new Date(),
                },
            }
        );
        await Track.updateOne({ _id: track._id, isDeleted: { $ne: true } }, {
            $set: {
                "fingerprintScreening.status": "failed",
                "fingerprintScreening.failureReason": errorCode,
            },
        });
        return { status: unavailableCodes.has(errorCode) ? "unavailable" : "failed", fingerprintId: claimed._id, errorCode };
    }
};

export const scheduleTrackAudioFingerprint = async (trackId, options = {}) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) return null;
    const track = await Track.findOne({ _id: trackId, isDeleted: { $ne: true } }).select("audioVersion").lean();
    if (!track) return { scheduled: false, reason: "track_deleted_or_not_found", trackId };
    const audioVersion = Number(options.audioVersion || track?.audioVersion || 1);
    const ensured = await ensureFingerprintRecord(trackId, options.sourceAudioHash || "", audioVersion);
    if (await discardActiveFingerprintIfTrackDeleted(trackId, ensured._id)) {
        return { scheduled: false, reason: "track_deleted_during_initialization", trackId };
    }
    setImmediate(() => {
        void processTrackAudioFingerprint(trackId, {
            sourceAudioHash: options.sourceAudioHash || "",
            sourceAudio: options.sourceAudio || null,
            audioVersion,
        }).catch((error) => {
            console.error("Audio fingerprint job failed:", error.message);
        });
    });
    return { scheduled: true, trackId };
};

export const processPendingAudioFingerprints = async ({ batchSize = 10, retryFailed = false } = {}) => {
    const filter = retryFailed
        ? { status: { $in: ["pending", "failed"] }, retryCount: { $lt: MAX_AUTOMATIC_RETRIES } }
        : { status: "pending" };
    const records = await AudioFingerprint.find(filter).sort({ createdAt: 1 }).limit(Math.min(100, Math.max(1, batchSize))).select("trackId").lean();
    const results = [];
    for (const record of records) {
        results.push(await processTrackAudioFingerprint(record.trackId));
    }
    return { found: records.length, results };
};

export const reprocessTrackAudioFingerprint = async (trackId) => {
    const track = await Track.findOne({ _id: trackId, isDeleted: { $ne: true } }).select("_id").lean();
    if (!track) return { status: "skipped", reason: "track_deleted_or_not_found" };
    const existing = await ensureFingerprintRecord(trackId);
    if (await discardActiveFingerprintIfTrackDeleted(trackId, existing._id)) {
        return { status: "skipped", reason: "track_deleted_during_initialization" };
    }
    if (
        existing.status === "processing" &&
        existing.processingStartedAt &&
        Date.now() - new Date(existing.processingStartedAt).getTime() < PROCESSING_STALE_MS
    ) {
        return { status: "processing", fingerprintId: existing._id, alreadyRunning: true };
    }

    await AudioFingerprint.updateOne(
        { trackId, algorithm: ALGORITHM, algorithmVersion: ALGORITHM_VERSION },
        { $set: { status: "pending", retryCount: 0, errorCode: "", error: "" } }
    );
    return processTrackAudioFingerprint(trackId, { force: true });
};

export default {
    processTrackAudioFingerprint,
    scheduleTrackAudioFingerprint,
    processPendingAudioFingerprints,
    reprocessTrackAudioFingerprint,
};
