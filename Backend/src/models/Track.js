import mongoose from "mongoose";

const { Schema, model } = mongoose;

const audioFileSchema = new Schema(
    {
        url: { type: String, required: true },
        format: { type: String, required: true },
        bitrate: { type: Number, required: true },
        label: {
            type: String,
            enum: ["original", "high", "medium", "low", "lowest"],
            default: "original",
        },
        priority: { type: Number, default: 0 },
    },
    { _id: false }
);

const copyrightEvidenceDocumentSchema = new Schema(
    {
        documentId: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: [
                "license",
                "contract",
                "copyright_certificate",
                "sample_clearance",
                "beat_license",
                "remix_permission",
                "other",
            ],
            default: "other",
        },
        version: { type: Number, min: 1, default: 1 },
        originalName: { type: String, default: "", trim: true, maxlength: 255 },
        mimeType: { type: String, default: "", trim: true, maxlength: 120 },
        size: { type: Number, min: 0, default: 0 },
        storageUrl: { type: String, default: "" },
        // Canonical aliases used by the moderation API. The old fields remain
        // so existing evidence documents can still be read safely.
        url: { type: String, default: "" },
        publicId: { type: String, default: "" },
        sha256: { type: String, default: "", trim: true, index: true },
        hash: { type: String, default: "", trim: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadStatus: {
            type: String,
            enum: ["uploaded", "replaced", "deleted", "failed"],
            default: "uploaded",
        },
        viewedAt: { type: Date, default: null },
        viewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        viewedSessionId: { type: Schema.Types.ObjectId, default: null },
    },
    { _id: false }
);

const copyrightSchema = new Schema(
    {
        copyrightOwner: { type: String, default: "" },
        recordingOwner: { type: String, default: "" },

        composer: { type: String, default: "" },
        lyricist: { type: String, default: "" },
        producer: { type: String, default: "" },

        isOriginal: { type: Boolean, default: true },
        isCover: { type: Boolean, default: false },
        isRemix: { type: Boolean, default: false },
        usesSample: { type: Boolean, default: false },
        usesLicensedBeat: { type: Boolean, default: false },

        // New canonical declaration. The legacy boolean flags remain for API compatibility.
        primaryCopyrightType: {
            type: String,
            // sample/licensed_beat are retained only for old records. New
            // submissions normalize them to original + secondary flags.
            enum: ["original", "cover", "remix", "sample", "licensed_beat"],
            default: "original",
        },
        usesThirdPartyBeat: { type: Boolean, default: false },
        rightsConfirmed: { type: Boolean, default: false },

        originalTrackTitle: { type: String, default: "" },
        originalArtistName: { type: String, default: "" },
        originalComposer: { type: String, default: "" },
        originalISRC: { type: String, default: "", trim: true },
        originalISWC: { type: String, default: "", trim: true },

        sampleSourceTitle: { type: String, default: "" },
        sampleSourceArtist: { type: String, default: "" },
        sampleSourceISRC: { type: String, default: "", trim: true },
        sampleStartTime: { type: Number, min: 0, default: null },
        sampleEndTime: { type: Number, min: 0, default: null },

        beatTitle: { type: String, default: "" },
        beatProducer: { type: String, default: "" },
        beatSourceUrl: { type: String, default: "" },
        licenseType: {
            type: String,
            enum: ["", "exclusive", "non_exclusive", "custom", "other"],
            default: "",
        },

        licenseDocumentUrls: [{ type: String }],
        copyrightEvidenceDocuments: [copyrightEvidenceDocumentSchema],

        declarationAccepted: { type: Boolean, default: false },

        copyrightStatus: {
            type: String,
            enum: ["pending", "verified", "rejected", "disputed"],
            default: "pending",
        },

        copyrightNote: { type: String, default: "" },
        copyrightNotes: { type: String, default: "" },
        isrc: { type: String, default: "", trim: true },
        iswc: { type: String, default: "", trim: true },
        proName: { type: String, default: "", trim: true },
        workRegistrationNumber: { type: String, default: "", trim: true },
        recordingId: { type: String, default: "", trim: true },
    },
    { _id: false }
);

const pendingTrackUpdateDataSchema = new Schema(
    {
        title: { type: String, trim: true, default: "" },
        versionTitle: { type: String, trim: true, default: "" },
        description: { type: String, default: "" },
        tags: [{ type: String, trim: true }],
        genreIds: [{ type: Schema.Types.ObjectId, ref: "Genre" }],
        audioFiles: [audioFileSchema],
        duration: { type: Number, min: 0, default: 0 },
        avatar: { type: String, default: "" },
        coverImage: [{ type: String }],
        lyricsStatic: { type: String, default: "" },
        lyricsSyncUrl: { type: String, default: "" },
        copyright: copyrightSchema,
    },
    { _id: false }
);

const pendingTrackUpdateSchema = new Schema(
    {
        status: {
            type: String,
            enum: ["none", "pending", "rejected"],
            default: "none",
        },
        data: {
            type: pendingTrackUpdateDataSchema,
            default: null,
        },
        changedFields: [{ type: String, trim: true }],
        submittedAt: { type: Date, default: null },
        lastSavedAt: { type: Date, default: null },
        reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        reviewedAt: { type: Date, default: null },
        adminNote: { type: String, default: "" },
        rejectReason: { type: String, default: "" },
        submissionVersion: { type: Number, min: 1, default: 1 },
        audioVersion: { type: Number, min: 1, default: 1 },
        copyrightVersion: { type: Number, min: 1, default: 1 },
        evidenceVersion: { type: Number, min: 1, default: 1 },
    },
    { _id: false }
);

const TrackSchema = new Schema(
    {
        title: { type: String, required: true, trim: true, index: true },
        versionTitle: { type: String, default: "", trim: true },
        description: { type: String, default: "" },
        tags: [{ type: String, trim: true }],
        artist_artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
        album_albumId: { type: Schema.Types.ObjectId, ref: "Album", index: true },
        genreIds: [{ type: Schema.Types.ObjectId, ref: "Genre" }],
        audioFiles: [audioFileSchema],

        duration: { type: Number, required: true, min: 0 },
        avatar: { type: String, default: "" },
        coverImage: [{ type: String }],
        lyricsStatic: { type: String, default: "" },
        lyricsSyncUrl: { type: String, default: "" },

        stats: {
            totalLike: { type: Number, default: 0, min: 0 },
            totalPlay: { type: Number, default: 0, min: 0 },
        },

        releaseDate: { type: Date },
        releaseStatus: {
            type: String,
            enum: ["unreleased", "scheduled", "released"],
            default: "unreleased",
            index: true,
        },
        releasedAt: { type: Date, default: null },
        activeStatus: {
            type: String,
            enum: ["draft", "active", "hidden", "blocked"],
            default: "draft",
            index: true,
        },
        approvalStatus: {
            type: String,
            enum: ["draft", "pending", "approved", "rejected"],
            default: "draft",
            index: true,
        },
        copyright: copyrightSchema,

        fingerprintScreening: {
            status: {
                type: String,
                enum: ["unknown", "pending", "processing", "passed", "flagged", "failed"],
                default: "unknown",
                index: true,
            },
            audioHash: { type: String, default: "", trim: true },
            audioVersion: { type: Number, min: 1, default: 1 },
            fingerprintId: { type: Schema.Types.ObjectId, ref: "AudioFingerprint", default: null },
            matchedTrackId: { type: Schema.Types.ObjectId, ref: "Track", default: null },
            enforcementEvidenceId: { type: Schema.Types.ObjectId, ref: "CopyrightFingerprintBlocklist", default: null },
            highestSimilarity: { type: Number, min: 0, max: 1, default: 0 },
            riskLevel: { type: String, enum: ["none", "low", "medium", "high"], default: "none" },
            exactDuplicate: { type: Boolean, default: false },
            failureReason: { type: String, default: "", trim: true, maxlength: 500 },
            completedAt: { type: Date, default: null },
        },
        // Version counters are used to prevent approving a stale review session.
        submissionVersion: { type: Number, min: 1, default: 1, index: true },
        audioVersion: { type: Number, min: 1, default: 1 },
        copyrightVersion: { type: Number, min: 1, default: 1 },
        evidenceVersion: { type: Number, min: 1, default: 1 },

        moderation: {
            submittedAt: { type: Date, default: null },
            reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
            reviewedAt: { type: Date, default: null },
            adminNote: { type: String, default: "" },

            violationFlags: [{
                type: String,
                enum: [
                    "copyright",
                    "missing_rights_proof",
                    "wrong_metadata",
                    "low_audio_quality",
                    "explicit_content",
                    "duplicate_track",
                    "other"
                ]
            }]
        },
        rejectReason: { 
            type: String,
            default: "",
        },

        blockedByAlbumId: {
            type: Schema.Types.ObjectId,
            ref: "Album",
            default: null,
            index: true,
        },
        blockedReason: { type: String, default: "" },
        hiddenReason: { type: String, default: "" },
        hiddenAt: { type: Date },
        previousActiveStatusBeforeArtistHide: {
            type: String,
            enum: ["draft", "active", null],
            default: null,
        },
        pendingUpdate: {
            type: pendingTrackUpdateSchema,
            default: () => ({
                status: "none",
                data: null,
                changedFields: [],
                submittedAt: null,
                lastSavedAt: null,
                reviewedBy: null,
                reviewedAt: null,
                adminNote: "",
                rejectReason: "",
            }),
        },

        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date },
        deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
        deleteReason: { type: String, default: "", trim: true },
        previousActiveStatusBeforeArtistBlock: {
            type: String,
            enum: ["draft", "active", "hidden", null],
            default: null,
        },
        blockedByArtistId: { type: Schema.Types.ObjectId, ref: "Artist", default: null, index: true },
    },
    { timestamps: true, optimisticConcurrency: true }
);

TrackSchema.index({ artist_artistId: 1, title: 1 });
// Titles remain unique for visible/live tracks, but a soft-deleted track must
// not reserve the artist's title/version forever.
TrackSchema.index(
    { artist_artistId: 1, title: 1, versionTitle: 1 },
    {
        unique: true,
        partialFilterExpression: { isDeleted: false },
        name: "unique_active_track_title_version",
    }
);
TrackSchema.index({ artist_artistId: 1, isDeleted: 1, activeStatus: 1, approvalStatus: 1 });
TrackSchema.index({ album_albumId: 1, isDeleted: 1, activeStatus: 1, approvalStatus: 1 });

const Track = model("Track", TrackSchema);
export default Track;   
