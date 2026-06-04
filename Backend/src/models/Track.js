import mongoose from "mongoose";

const { Schema, model } = mongoose;

const TrackSchema = new Schema(
    {
        title: { type: String, required: true, trim: true, index: true },
        artist_artistId: { type: Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
        album_albumId: { type: Schema.Types.ObjectId, ref: "Album", index: true },
        genreIds: [{ type: Schema.Types.ObjectId, ref: "Genre" }],
        audioFiles: [{
            url: { type: String, required: true },
            format: { type: String, required: true },
            bitrate: { type: Number, required: true },
            label: { type: String, enum: ["original", "high", "medium", "low", "lowest"], default: "original" },
            priority: { type: Number, default: 0 },
        }],

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
        activeStatus: {
            type: String,
            enum: ["draft", "active", "inactive","hidden", "blocked"],
            default: "draft",
            index: true,
        },
        approvalStatus: {
            type: String,
            enum: ["draft", "pending", "approved", "rejected"],
            default: "draft",
            index: true,
        },
        copyright: {
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

            originalTrackTitle: { type: String, default: "" },
            originalArtistName: { type: String, default: "" },

            licenseDocumentUrls: [{ type: String }],

            declarationAccepted: { type: Boolean, default: false },

            copyrightStatus: {
                type: String,
                enum: ["pending", "verified", "rejected", "disputed"],
                default: "pending",
            },

            copyrightNote: { type: String, default: "" },
        },

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

        blockedReason: { type: String, default: "" },
        hiddenReason: { type: String, default: "" },
        hiddenAt: { type: Date },
    },
    { timestamps: true }
);

TrackSchema.index({ artist_artistId: 1, title: 1 });

const Track = model("Track", TrackSchema);
export default Track;   
