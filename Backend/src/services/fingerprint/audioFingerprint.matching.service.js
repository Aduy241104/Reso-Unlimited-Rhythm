import mongoose from "mongoose";
import AudioFingerprint from "../../models/AudioFingerprint.js";
import AudioFingerprintMatch from "../../models/AudioFingerprintMatch.js";
import CopyrightRegistry from "../../models/CopyrightRegistry.js";
import Track from "../../models/Track.js";
import { assessCopyrightRisk } from "./copyrightRisk.service.js";
import { compareFingerprints } from "./fingerprintSimilarity.service.js";
import { activeFingerprintScopeFilter } from "./fingerprint.lifecycle.service.js";
import { getCandidateContext } from "./moderationDecision.service.js";

const ALGORITHM_VERSION = "chromaprint-v1";

const canonicalPair = (firstId, secondId) => [String(firstId), String(secondId)].sort();

const getTrackAudioVersion = (track) => Number(
    track?.pendingUpdate?.status === "pending"
        ? track.pendingUpdate.audioVersion
        : track?.audioVersion
) || 1;

const upsertMatch = async ({
    sourceTrack,
    matchedTrack,
    sourceRegistry,
    matchedRegistry,
    matchType,
    comparison,
    sourceAudioVersion = null,
    matchedAudioVersion = null,
    sourceContext = null,
    matchedContext = null,
}) => {
    const [sourceTrackId, matchedTrackId] = canonicalPair(sourceTrack._id, matchedTrack._id);
    const canonicalSourceTrack = String(sourceTrack._id) === String(sourceTrackId) ? sourceTrack : matchedTrack;
    const canonicalMatchedTrack = String(sourceTrack._id) === String(sourceTrackId) ? matchedTrack : sourceTrack;
    const sourceVersion = Number(sourceAudioVersion || getTrackAudioVersion(sourceTrack)) || 1;
    const matchedVersion = Number(matchedAudioVersion || getTrackAudioVersion(matchedTrack)) || 1;
    const canonicalSourceIsCallerSource = String(sourceTrack._id) === String(sourceTrackId);
    const canonicalSourceAudioVersion = canonicalSourceIsCallerSource ? sourceVersion : matchedVersion;
    const canonicalMatchedAudioVersion = canonicalSourceIsCallerSource ? matchedVersion : sourceVersion;
    const canonicalSourceContext = canonicalSourceIsCallerSource ? sourceContext : matchedContext;
    const canonicalMatchedContext = canonicalSourceIsCallerSource ? matchedContext : sourceContext;
    const effectiveComparison = comparison || {
        similarityScore: 1,
        overlapScore: 1,
        overlapSeconds: Math.min(Number(sourceTrack.duration || 0), Number(matchedTrack.duration || 0)),
        overlapRatio: 1,
        durationDifference: Math.abs(Number(sourceTrack.duration || 0) - Number(matchedTrack.duration || 0)),
        bestOffset: 0,
        classification: "high",
    };
    const risk = assessCopyrightRisk({
        sourceTrack,
        matchedTrack,
        sourceRegistry,
        matchedRegistry,
        match: { matchType, ...effectiveComparison },
    });
    const severity = matchType === "exact_file_duplicate" || effectiveComparison.classification === "high"
        ? "high"
        : effectiveComparison.classification === "review" ? "review" : "none";

    const query = {
        sourceTrackId,
        matchedTrackId,
        algorithmVersion: ALGORITHM_VERSION,
        sourceAudioVersion: canonicalSourceAudioVersion,
        matchedAudioVersion: canonicalMatchedAudioVersion,
    };
    try {
        return await AudioFingerprintMatch.findOneAndUpdate(
            query,
            {
                $set: {
                    algorithm: "chromaprint",
                    matchType,
                    similarityScore: effectiveComparison.similarityScore,
                    overlapScore: effectiveComparison.overlapScore,
                    overlapSeconds: effectiveComparison.overlapSeconds,
                    overlapRatio: effectiveComparison.overlapRatio,
                    durationDifference: effectiveComparison.durationDifference,
                    bestOffset: effectiveComparison.bestOffset,
                    severity,
                    riskScore: risk.score,
                    riskLevel: risk.level,
                    riskSignals: risk.signals,
                    sourceAudioVersion: canonicalSourceAudioVersion,
                    matchedAudioVersion: canonicalMatchedAudioVersion,
                    candidateContext: canonicalMatchedContext || getCandidateContext(canonicalMatchedTrack),
                    sourceContext: canonicalSourceContext || getCandidateContext(canonicalSourceTrack),
                    matchedContext: canonicalMatchedContext || getCandidateContext(canonicalMatchedTrack),
                    matchingScope: "active",
                },
                $setOnInsert: {
                    sourceTrackId,
                    matchedTrackId,
                    algorithmVersion: ALGORITHM_VERSION,
                    status: "detected",
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        if (error?.code !== 11000) throw error;
        return AudioFingerprintMatch.findOne(query);
    }
};

export const recordExactFileDuplicateMatch = async ({
    sourceTrackId,
    matchedTrackId,
    sourceAudioVersion = null,
    matchedAudioVersion = null,
}) => {
    if (!mongoose.Types.ObjectId.isValid(sourceTrackId) || !mongoose.Types.ObjectId.isValid(matchedTrackId)) {
        return null;
    }

    const [sourceTrack, matchedTrack, sourceFingerprint, matchedFingerprint] = await Promise.all([
        Track.findById(sourceTrackId).lean(),
        Track.findById(matchedTrackId).lean(),
        AudioFingerprint.findOne({ trackId: sourceTrackId, algorithmVersion: ALGORITHM_VERSION })
            .select("status matchingScope audioVersion sourceAudioHash")
            .lean(),
        AudioFingerprint.findOne({ trackId: matchedTrackId, algorithmVersion: ALGORITHM_VERSION })
            .select("status matchingScope audioVersion sourceAudioHash")
            .lean(),
    ]);

    if (!sourceTrack || !matchedTrack || String(sourceTrack._id) === String(matchedTrack._id)) {
        return null;
    }

    if (
        !sourceFingerprint ||
        !matchedFingerprint ||
        sourceFingerprint.status !== "completed" ||
        matchedFingerprint.status !== "completed" ||
        sourceFingerprint.matchingScope !== "active" ||
        matchedFingerprint.matchingScope !== "active" ||
        !String(sourceFingerprint.sourceAudioHash || "").trim() ||
        !String(matchedFingerprint.sourceAudioHash || "").trim() ||
        String(sourceFingerprint.sourceAudioHash) !== String(matchedFingerprint.sourceAudioHash) ||
        Number(sourceFingerprint.audioVersion || 0) !== Number(sourceAudioVersion || getTrackAudioVersion(sourceTrack)) ||
        Number(matchedFingerprint.audioVersion || 0) !== Number(matchedAudioVersion || getTrackAudioVersion(matchedTrack))
    ) {
        return null;
    }

    const registries = await CopyrightRegistry.find({
        trackId: { $in: [sourceTrack._id, matchedTrack._id] },
    }).lean();
    const registryMap = new Map(registries.map((registry) => [String(registry.trackId), registry]));

    return upsertMatch({
        sourceTrack,
        matchedTrack,
        sourceRegistry: registryMap.get(String(sourceTrack._id)),
        matchedRegistry: registryMap.get(String(matchedTrack._id)),
        matchType: "exact_file_duplicate",
        sourceAudioVersion: sourceAudioVersion || sourceFingerprint?.audioVersion,
        matchedAudioVersion: matchedAudioVersion || matchedFingerprint?.audioVersion,
        sourceContext: getCandidateContext(sourceTrack),
        matchedContext: getCandidateContext(matchedTrack),
    });
};

export const rebuildMatchesForTrack = async (trackId) => {
    if (!mongoose.Types.ObjectId.isValid(trackId)) return { exactMatches: 0, similarityMatches: 0, candidates: 0 };

    const sourceFingerprint = await AudioFingerprint.findOne({
        trackId,
        status: "completed",
        algorithmVersion: ALGORITHM_VERSION,
        ...activeFingerprintScopeFilter(),
    }).lean();
    const sourceTrack = await Track.findOne({ _id: trackId, isDeleted: { $ne: true } }).lean();
    if (
        !sourceFingerprint ||
        !sourceTrack ||
        Number(sourceFingerprint.audioVersion || 0) !== getTrackAudioVersion(sourceTrack)
    ) {
        return { exactMatches: 0, similarityMatches: 0, candidates: 0 };
    }

    const sourceTarget = sourceTrack.pendingUpdate?.status === "pending" && sourceTrack.pendingUpdate.data
        ? sourceTrack.pendingUpdate.data
        : sourceTrack;
    const duration = Number(sourceFingerprint.duration || sourceTarget.duration || sourceTrack.duration || 0);
    const tolerance = Math.max(30, duration * 0.35);
    const maxCandidates = Number.parseInt(process.env.FINGERPRINT_MAX_CANDIDATES, 10) || 500;
    const exactCandidates = sourceFingerprint.sourceAudioHash
        ? await AudioFingerprint.find({
            trackId: { $ne: sourceTrack._id },
            status: "completed",
            algorithmVersion: ALGORITHM_VERSION,
            ...activeFingerprintScopeFilter(),
            sourceAudioHash: sourceFingerprint.sourceAudioHash,
        }).sort({ updatedAt: -1 }).limit(maxCandidates).lean()
        : [];
    const exactTrackIds = new Set(exactCandidates.map((candidate) => String(candidate.trackId)));
    const similarityCandidates = await AudioFingerprint.find({
        trackId: { $ne: sourceTrack._id },
        status: "completed",
        algorithmVersion: ALGORITHM_VERSION,
        ...activeFingerprintScopeFilter(),
        ...(sourceFingerprint.sourceAudioHash ? { sourceAudioHash: { $ne: sourceFingerprint.sourceAudioHash } } : {}),
        duration: { $gte: Math.max(0, duration - tolerance), $lte: duration + tolerance },
    }).sort({ updatedAt: -1 }).limit(maxCandidates).lean();
    const candidates = [
        ...exactCandidates,
        ...similarityCandidates.filter((candidate) => !exactTrackIds.has(String(candidate.trackId))),
    ];

    const candidateTrackIds = candidates.map((candidate) => candidate.trackId);
    const [tracks, registries] = await Promise.all([
        Track.find({ _id: { $in: candidateTrackIds }, isDeleted: { $ne: true } }).lean(),
        CopyrightRegistry.find({ trackId: { $in: [sourceTrack._id, ...candidateTrackIds] } }).lean(),
    ]);
    const trackMap = new Map(tracks.map((track) => [String(track._id), track]));
    const registryMap = new Map(registries.map((registry) => [String(registry.trackId), registry]));
    const currentCandidates = candidates.filter((candidate) => {
        const candidateTrack = trackMap.get(String(candidate.trackId));
        return candidateTrack &&
            Number(candidate.audioVersion || 0) === getTrackAudioVersion(candidateTrack);
    });
    let exactMatches = 0;
    let similarityMatches = 0;

    for (const candidate of currentCandidates) {
        const matchedTrack = trackMap.get(String(candidate.trackId));
        if (!matchedTrack) continue;

        if (sourceFingerprint.sourceAudioHash && sourceFingerprint.sourceAudioHash === candidate.sourceAudioHash) {
            const exactMatch = await recordExactFileDuplicateMatch({
                sourceTrackId: sourceTrack._id,
                matchedTrackId: matchedTrack._id,
                sourceAudioVersion: sourceFingerprint.audioVersion,
                matchedAudioVersion: candidate.audioVersion,
            });
            if (exactMatch) exactMatches += 1;
            continue;
        }

        const comparison = compareFingerprints(
            sourceFingerprint.rawFingerprint || [],
            candidate.rawFingerprint || [],
            { durationA: sourceFingerprint.duration, durationB: candidate.duration }
        );
        if (!comparison || comparison.classification === "none") continue;

        await upsertMatch({
            sourceTrack,
            matchedTrack,
            sourceRegistry: registryMap.get(String(sourceTrack._id)),
            matchedRegistry: registryMap.get(String(matchedTrack._id)),
            matchType: "chromaprint",
            comparison,
            sourceAudioVersion: sourceFingerprint.audioVersion,
            matchedAudioVersion: candidate.audioVersion,
        });
        similarityMatches += 1;
    }

    return { exactMatches, similarityMatches, candidates: currentCandidates.length };
};

export default { rebuildMatchesForTrack };
