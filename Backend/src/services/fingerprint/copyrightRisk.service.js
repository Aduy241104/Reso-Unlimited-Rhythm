const normalizeOwner = (value) => String(value || "")
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase();

const hasLicenseEvidence = (copyright = {}) =>
    Boolean(
        copyright?.licenseDocumentUrls?.some?.((url) => String(url || "").trim()) ||
        copyright?.copyrightEvidenceDocuments?.some?.((document) => document?.uploadStatus === "uploaded" && document?.sha256)
    );

export const assessCopyrightRisk = ({ sourceTrack, matchedTrack, sourceRegistry, matchedRegistry, match }) => {
    const signals = [];
    let score = 0;
    const sourceCopyright = {
        ...(sourceTrack?.copyright || {}),
        ...(sourceRegistry?.rightsOwner ? { copyrightOwner: sourceRegistry.rightsOwner } : {}),
        ...(sourceRegistry?.recording?.owner ? { recordingOwner: sourceRegistry.recording.owner } : {}),
        ...(sourceRegistry?.recording?.recordingId ? { recordingId: sourceRegistry.recording.recordingId } : {}),
        ...(sourceRegistry?.recording?.isrc ? { isrc: sourceRegistry.recording.isrc } : {}),
    };
    const matchedCopyright = {
        ...(matchedTrack?.copyright || {}),
        ...(matchedRegistry?.rightsOwner ? { copyrightOwner: matchedRegistry.rightsOwner } : {}),
        ...(matchedRegistry?.recording?.owner ? { recordingOwner: matchedRegistry.recording.owner } : {}),
        ...(matchedRegistry?.recording?.recordingId ? { recordingId: matchedRegistry.recording.recordingId } : {}),
        ...(matchedRegistry?.recording?.isrc ? { isrc: matchedRegistry.recording.isrc } : {}),
    };

    if (match.matchType === "exact_file_duplicate") {
        score += 45;
        signals.push({ code: "exact_audio_hash_duplicate", weight: 45, description: "The source audio file hash exactly matches another track." });
    } else if (match.similarityScore >= 0.88) {
        score += 35;
        signals.push({ code: "high_chromaprint_similarity", weight: 35, description: "Chromaprint similarity and overlap are high." });
    } else {
        score += 15;
        signals.push({ code: "medium_chromaprint_similarity", weight: 15, description: "A possible audio-content match requires review." });
    }

    const sourceOwner = normalizeOwner(sourceCopyright.copyrightOwner || sourceCopyright.recordingOwner);
    const matchedOwner = normalizeOwner(matchedCopyright.copyrightOwner || matchedCopyright.recordingOwner);
    if (sourceOwner && matchedOwner && sourceOwner === matchedOwner) {
        score -= 20;
        signals.push({ code: "same_declared_rights_owner", weight: -20, description: "Both tracks declare the same normalized rights owner." });
    } else if (sourceOwner && matchedOwner && sourceOwner !== matchedOwner) {
        score += 30;
        signals.push({ code: "rights_owner_mismatch", weight: 30, description: "The compared tracks declare different rights owners." });
    }

    const sourceIsrc = normalizeOwner(sourceCopyright.isrc);
    const matchedIsrc = normalizeOwner(matchedCopyright.isrc);
    if (sourceIsrc && matchedIsrc && sourceIsrc === matchedIsrc) {
        score -= 10;
        signals.push({ code: "same_declared_isrc", weight: -10, description: "Both tracks declare the same ISRC." });
    } else if (sourceIsrc && matchedIsrc && sourceIsrc !== matchedIsrc) {
        score += 20;
        signals.push({ code: "isrc_mismatch", weight: 20, description: "The compared tracks declare different ISRC values." });
    }

    const sourceRecordingId = normalizeOwner(sourceCopyright.recordingId);
    const matchedRecordingId = normalizeOwner(matchedCopyright.recordingId);
    if (sourceRecordingId && matchedRecordingId && sourceRecordingId === matchedRecordingId) {
        score -= 15;
        signals.push({ code: "same_recording_id", weight: -15, description: "Both tracks are linked to the same declared recording." });
    }

    const sourceHasLicense = hasLicenseEvidence(sourceCopyright);
    if (sourceCopyright.isCover || sourceCopyright.isRemix || sourceCopyright.usesSample || sourceCopyright.usesThirdPartyBeat || sourceCopyright.usesLicensedBeat) {
        if (sourceHasLicense) {
            score -= 15;
            signals.push({ code: "declared_third_party_use_with_evidence", weight: -15, description: "Third-party use is declared with license evidence." });
        } else {
            score += 15;
            signals.push({ code: "third_party_use_without_evidence", weight: 15, description: "Third-party use is declared without a linked license document." });
        }
    }

    if (Array.isArray(sourceTrack?.violations) && sourceTrack.violations.length > 0) {
        score += 10;
        signals.push({ code: "previous_artist_violations", weight: 10, description: "The source artist has previous moderation violations." });
    }

    const normalizedScore = Math.min(100, Math.max(0, score));
    return {
        score: normalizedScore,
        level: normalizedScore >= 65 ? "high" : normalizedScore >= 35 ? "medium" : "low",
        signals,
    };
};

export default { assessCopyrightRisk };
