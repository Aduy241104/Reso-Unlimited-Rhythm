import "dotenv/config";
import mongoose from "mongoose";
import cloudinary from "../src/config/cloudinaryConfig.js";
import connectMongoose from "../src/config/db.js";
import Track from "../src/models/Track.js";
import AudioFingerprint from "../src/models/AudioFingerprint.js";
import AudioFingerprintMatch from "../src/models/AudioFingerprintMatch.js";
import CopyrightFingerprintBlocklist from "../src/models/CopyrightFingerprintBlocklist.js";
import CopyrightRegistry from "../src/models/CopyrightRegistry.js";
import { cleanupTrackFingerprintLifecycle } from "../src/services/fingerprint/fingerprint.lifecycle.service.js";
import { deleteCloudinaryAssetsByUrls, extractPublicIdFromUrl } from "../src/utils/uploadCloud.js";

const apply = process.argv.includes("--apply");
const STALE_PROCESSING_MS = 10 * 60 * 1000;

const hasEnforcementViolation = (track) => {
    const flags = Array.isArray(track?.moderation?.violationFlags)
        ? track.moderation.violationFlags
        : [];
    return Boolean(
        track?.fingerprintScreening?.exactDuplicate ||
        track?.copyright?.copyrightStatus === "disputed" ||
        flags.some((flag) => ["copyright", "duplicate_track", "missing_rights_proof"].includes(flag))
    );
};

const listCloudinaryAudioResources = async () => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return { available: false, resources: [], reason: "Cloudinary credentials are not configured." };
    }

    try {
        const resources = [];
        let nextCursor = undefined;
        do {
            const result = await cloudinary.api.resources({
                type: "upload",
                resource_type: "video",
                prefix: "tracks/audio",
                max_results: 500,
                ...(nextCursor ? { next_cursor: nextCursor } : {}),
            });
            resources.push(...(result.resources || []));
            nextCursor = result.next_cursor;
        } while (nextCursor);

        return { available: true, resources };
    } catch (error) {
        return {
            available: false,
            resources: [],
            reason: `Cloudinary audit failed: ${String(error?.message || error).slice(0, 300)}`,
        };
    }
};

const run = async () => {
    await connectMongoose();

    const [tracks, fingerprints, matches, blocklist] = await Promise.all([
        Track.find({}).select("_id title artist_artistId deletedAt isDeleted approvalStatus moderation fingerprintScreening copyright pendingUpdate").lean(),
        AudioFingerprint.find({}).select("_id trackId sourceAudioHash status matchingScope processingStartedAt").lean(),
        AudioFingerprintMatch.find({}).select("_id sourceTrackId matchedTrackId matchingScope disputeClaimId").lean(),
        CopyrightFingerprintBlocklist.find({ status: "active" }).select("sourceAudioHash sourceTrackId").lean(),
    ]);

    const trackMap = new Map(tracks.map((track) => [String(track._id), track]));
    const retainedHashSet = new Set(blocklist.map((item) => item.sourceAudioHash).filter(Boolean));
    const orphanFingerprints = fingerprints.filter((fingerprint) => !trackMap.has(String(fingerprint.trackId)));
    const deletedDraftTracks = tracks.filter((track) => (
        track.isDeleted === true &&
        track.approvalStatus === "draft" &&
        !hasEnforcementViolation(track)
    ));
    const deletedDraftFingerprints = fingerprints.filter((fingerprint) => {
        const track = trackMap.get(String(fingerprint.trackId));
        return track?.isDeleted === true &&
            fingerprint.matchingScope !== "enforcement" &&
            !retainedHashSet.has(fingerprint.sourceAudioHash) &&
            track.approvalStatus === "draft" &&
            !hasEnforcementViolation(track);
    });
    const legacyViolationTracks = tracks.filter((track) => (
        track.isDeleted === true &&
        hasEnforcementViolation(track) &&
        fingerprints.some((fingerprint) => (
            String(fingerprint.trackId) === String(track._id) &&
            fingerprint.sourceAudioHash &&
            fingerprint.matchingScope !== "enforcement"
        ))
    ));
    const staleProcessing = fingerprints.filter((fingerprint) => (
        fingerprint.status === "processing" &&
        fingerprint.matchingScope !== "enforcement" &&
        fingerprint.processingStartedAt &&
        Date.now() - new Date(fingerprint.processingStartedAt).getTime() > STALE_PROCESSING_MS
    ));
    const orphanMatches = matches.filter((match) => (
        !trackMap.has(String(match.sourceTrackId)) && !trackMap.has(String(match.matchedTrackId))
    ));
    const purgeableOrphanMatchIds = orphanMatches
        .filter((match) => match.matchingScope !== "enforcement" && !match.disputeClaimId)
        .map((match) => match._id);
    const referencedAudioPublicIds = new Set(
        tracks
            .filter((track) => !track.isDeleted || hasEnforcementViolation(track))
            .flatMap((track) => (track.audioFiles || []).map((file) => extractPublicIdFromUrl(file?.url)).filter(Boolean))
    );
    const cloudinaryAudit = await listCloudinaryAudioResources();
    const orphanAudioResources = cloudinaryAudit.resources.filter((resource) => !referencedAudioPublicIds.has(resource.public_id));

    console.log(JSON.stringify({
        mode: apply ? "apply" : "dry-run",
        tracks: tracks.length,
        orphanFingerprints: orphanFingerprints.length,
        deletedDraftFingerprints: deletedDraftFingerprints.length,
        legacyViolationTracks: legacyViolationTracks.length,
        staleProcessingJobs: staleProcessing.length,
        orphanMatches: orphanMatches.length,
        purgeableOrphanMatches: purgeableOrphanMatchIds.length,
        retainedEnforcementEvidence: blocklist.length,
        orphanAudioVariants: cloudinaryAudit.available ? orphanAudioResources.length : "not_checked",
        cloudinary: cloudinaryAudit.available ? "checked" : cloudinaryAudit.reason,
    }, null, 2));

    if (!apply) return;

    const deletableFingerprintIds = deletedDraftFingerprints
        .filter((item) => !retainedHashSet.has(item.sourceAudioHash))
        .map((item) => item._id);
    const orphanFingerprintIds = orphanFingerprints
        .filter((item) => item.matchingScope !== "enforcement" && !retainedHashSet.has(item.sourceAudioHash))
        .map((item) => item._id);
    const fingerprintsToDelete = [...new Set([...deletableFingerprintIds, ...orphanFingerprintIds].map(String))];
    if (fingerprintsToDelete.length) {
        await AudioFingerprint.deleteMany({ _id: { $in: fingerprintsToDelete }, matchingScope: { $ne: "enforcement" } });
    }

    if (purgeableOrphanMatchIds.length) {
        await AudioFingerprintMatch.deleteMany({ _id: { $in: purgeableOrphanMatchIds } });
    }

    for (const track of legacyViolationTracks) {
        await cleanupTrackFingerprintLifecycle(track, { actorUserId: null });
    }

    const deletedDraftTrackIds = deletedDraftTracks.map((track) => track._id);
    if (deletedDraftTrackIds.length) {
        await CopyrightRegistry.deleteMany({ trackId: { $in: deletedDraftTrackIds } });
        await AudioFingerprintMatch.deleteMany({
            $or: [
                { sourceTrackId: { $in: deletedDraftTrackIds } },
                { matchedTrackId: { $in: deletedDraftTrackIds } },
            ],
        });
    }

    if (staleProcessing.length) {
        await AudioFingerprint.updateMany(
            { _id: { $in: staleProcessing.map((item) => item._id) }, matchingScope: { $ne: "enforcement" } },
            { $set: { status: "failed", errorCode: "stale_processing_recovered", processingStartedAt: null } }
        );
    }

    if (cloudinaryAudit.available && orphanAudioResources.length) {
        await deleteCloudinaryAssetsByUrls(orphanAudioResources.map((resource) => resource.secure_url));
    }
};

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close().catch(() => null);
    });
