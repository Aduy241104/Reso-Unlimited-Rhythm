import crypto from "node:crypto";

// Only these fields participate in the artist-editable rejection snapshot.
// Provider results, moderation/audit metadata and evidence review metadata are
// deliberately excluded so background jobs cannot create a false change.
export const TRACK_MUTABLE_FIELDS = [
    "title",
    "versionTitle",
    "description",
    "tags",
    "genreIds",
    "audioFiles",
    "duration",
    "avatar",
    "coverImage",
    "lyricsStatic",
    "lyricsSyncUrl",
    "copyright",
];

export const ARTIST_EVIDENCE_UPDATE_FIELDS = [
    "documentId",
    "type",
    "version",
    "originalName",
    "mimeType",
    "size",
    "storageUrl",
    "url",
    "publicId",
    "sha256",
    "hash",
    "uploadStatus",
];

export const ARTIST_COPYRIGHT_UPDATE_FIELDS = [
    "copyrightOwner",
    "recordingOwner",
    "composer",
    "lyricist",
    "producer",
    "isOriginal",
    "isCover",
    "isRemix",
    "usesSample",
    "usesLicensedBeat",
    "primaryCopyrightType",
    "usesThirdPartyBeat",
    "rightsConfirmed",
    "originalTrackTitle",
    "originalArtistName",
    "originalComposer",
    "originalISRC",
    "originalISWC",
    "sampleSourceTitle",
    "sampleSourceArtist",
    "sampleSourceISRC",
    "sampleStartTime",
    "sampleEndTime",
    "beatTitle",
    "beatProducer",
    "beatSourceUrl",
    "licenseType",
    "licenseDocumentUrls",
    "copyrightEvidenceDocuments",
    "declarationAccepted",
    "copyrightNote",
    "copyrightNotes",
    "isrc",
    "iswc",
    "proName",
    "workRegistrationNumber",
    "recordingId",
];

const normalizeEvidence = (document = {}) => {
    const source = document?.toObject?.() || document || {};
    return ARTIST_EVIDENCE_UPDATE_FIELDS.reduce((result, field) => {
        if (source[field] !== undefined && source[field] !== null) {
            result[field] = source[field];
        }
        return result;
    }, {});
};

export const serializeArtistCopyrightForSnapshot = (copyright = {}) => {
    const source = copyright?.toObject?.() || copyright || {};
    return ARTIST_COPYRIGHT_UPDATE_FIELDS.reduce((result, field) => {
        if (source[field] === undefined || source[field] === null) return result;

        if (field === "copyrightEvidenceDocuments") {
            result[field] = Array.isArray(source[field])
                ? source[field].map(normalizeEvidence)
                : [];
        } else if (field === "licenseDocumentUrls") {
            result[field] = Array.isArray(source[field]) ? source[field].map(String) : [];
        } else {
            result[field] = source[field];
        }
        return result;
    }, {});
};

const normalizeForComparison = (value) => {
    if (Array.isArray(value)) return value.map(normalizeForComparison);
    if (value instanceof Date) return value.toISOString();
    if (!value || typeof value !== "object") return value;

    return Object.keys(value)
        .sort()
        .reduce((result, key) => {
            result[key] = normalizeForComparison(value[key]);
            return result;
        }, {});
};

export const normalizeTrackMutableData = (source = {}) => ({
    title: String(source.title || "").trim(),
    versionTitle: String(source.versionTitle || "").trim(),
    description: String(source.description || ""),
    tags: Array.isArray(source.tags) ? source.tags.map(String) : [],
    genreIds: Array.isArray(source.genreIds)
        ? source.genreIds.map((genreId) => String(genreId?._id || genreId || "")).sort()
        : [],
    audioFiles: Array.isArray(source.audioFiles)
        ? source.audioFiles.map((file) => normalizeForComparison({
            url: file?.url || "",
            format: file?.format || "",
            bitrate: Number(file?.bitrate) || 0,
            label: file?.label || "",
            priority: Number(file?.priority) || 0,
        }))
        : [],
    duration: Number(source.duration) || 0,
    avatar: String(source.avatar || ""),
    coverImage: Array.isArray(source.coverImage) ? source.coverImage.map(String) : [],
    lyricsStatic: String(source.lyricsStatic || ""),
    lyricsSyncUrl: String(source.lyricsSyncUrl || ""),
    copyright: serializeArtistCopyrightForSnapshot(source.copyright || {}),
});

export const getMeaningfulChangedFields = (before = {}, after = {}) => {
    const normalizedBefore = normalizeTrackMutableData(before);
    const normalizedAfter = normalizeTrackMutableData(after);

    return TRACK_MUTABLE_FIELDS.filter((field) => (
        JSON.stringify(normalizeForComparison(normalizedBefore[field])) !==
        JSON.stringify(normalizeForComparison(normalizedAfter[field]))
    ));
};

export const getCopyrightChangeFlags = (beforeCopyright = {}, afterCopyright = {}) => {
    const before = serializeArtistCopyrightForSnapshot(beforeCopyright);
    const after = serializeArtistCopyrightForSnapshot(afterCopyright);
    const beforeEvidence = before.copyrightEvidenceDocuments || [];
    const afterEvidence = after.copyrightEvidenceDocuments || [];
    const declarationBefore = { ...before };
    const declarationAfter = { ...after };
    delete declarationBefore.copyrightEvidenceDocuments;
    delete declarationAfter.copyrightEvidenceDocuments;

    return {
        declarationChanged: JSON.stringify(normalizeForComparison(declarationBefore)) !== JSON.stringify(normalizeForComparison(declarationAfter)),
        evidenceChanged: JSON.stringify(normalizeForComparison(beforeEvidence)) !== JSON.stringify(normalizeForComparison(afterEvidence)),
    };
};

export const hashTrackMutableData = (trackOrData = {}) => crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizeForComparison(normalizeTrackMutableData(trackOrData))))
    .digest("hex");

export const getTrackRejectionSnapshot = (track) => ({
    rejectionId: String(track?.moderation?.lastRejection?.rejectionId || ""),
    rejectReason: track?.moderation?.lastRejection?.rejectReason || track?.rejectReason || "",
    violationFlags: track?.moderation?.lastRejection?.violationFlags || track?.moderation?.violationFlags || [],
    submissionVersion: Number(track?.moderation?.lastRejection?.submissionVersion || track?.submissionVersion || 1),
    audioVersion: Number(track?.moderation?.lastRejection?.audioVersion || track?.audioVersion || 1),
    copyrightVersion: Number(track?.moderation?.lastRejection?.copyrightVersion || track?.copyrightVersion || 1),
    evidenceVersion: Number(track?.moderation?.lastRejection?.evidenceVersion || track?.evidenceVersion || 1),
    mutableSnapshotHash: track?.moderation?.lastRejection?.mutableSnapshotHash || hashTrackMutableData(track),
    rejectedAt: track?.moderation?.lastRejection?.rejectedAt || track?.moderation?.reviewedAt || null,
});

export const getCurrentTrackRejectionState = (track) => ({
    rejectionId: String(track?.moderation?.lastRejection?.rejectionId || ""),
    submissionVersion: Number(track?.submissionVersion || 1),
    audioVersion: Number(track?.audioVersion || 1),
    copyrightVersion: Number(track?.copyrightVersion || 1),
    evidenceVersion: Number(track?.evidenceVersion || 1),
    mutableSnapshotHash: hashTrackMutableData(track),
});

export const isSameRejectionSnapshot = (left = {}, right = {}) => (
    String(left.rejectionId || "") === String(right.rejectionId || "") &&
    Number(left.submissionVersion || 1) === Number(right.submissionVersion || 1) &&
    Number(left.audioVersion || 1) === Number(right.audioVersion || 1) &&
    Number(left.copyrightVersion || 1) === Number(right.copyrightVersion || 1) &&
    Number(left.evidenceVersion || 1) === Number(right.evidenceVersion || 1) &&
    String(left.mutableSnapshotHash || "") === String(right.mutableSnapshotHash || "")
);
