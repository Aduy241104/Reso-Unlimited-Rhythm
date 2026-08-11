import mongoose from "mongoose";
import { normalizeArtistName } from "../services/artist/artist.name.normalizer.js";

const { Schema, model } = mongoose;

const ArtistSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },

        name: { type: String, required: true, trim: true, index: true },
        nameKey: { type: String, trim: true },
        bio: { type: String, default: "" },
        avatar: { type: String, default: "" },
        coverImage: { type: String, default: "" },

        socialLinks: {
            facebook: { type: String, default: "" },
            instagram: { type: String, default: "" },
            youtube: { type: String, default: "" },
            tiktok: { type: String, default: "" },
            spotify: { type: String, default: "" },
            soundcloud: { type: String, default: "" },
            website: { type: String, default: "" },
            twitter: { type: String, default: "" },
            other: { type: String, default: "" },
        },

        stats: {
            followers: { type: Number, default: 0, min: 0 },
            totalStreams: { type: Number, default: 0, min: 0 },
            monthlyListeners: { type: Number, default: 0, min: 0 },
        },

        revenue: {
            totalWithdrawnAmount: Number,
            availableAmount: Number,
            confirmedRevenueSummaryIds: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "ArtistRevenueSummary",
                },
            ],
        },

        payoutAccounts: [
            {
                bankName: { type: String, trim: true, required: true },
                accountNumber: { type: String, trim: true, required: true },
                accountHolderName: { type: String, trim: true, required: true },
                isDefault: { type: Boolean, default: false },
            },
        ],

        withdrawalSecurity: {
            passwordHash: { type: String, default: "" },
        },

        activeStatus: {
            type: String,
            enum: ["active", "inactive", "blocked"],
            default: "active",
            index: true,
        },

        violations: [
            {
                content: { type: String, required: true, trim: true },
                violatedAt: { type: Date, default: Date.now },
            },
        ],

        blockedReason: { type: String, default: "" },

        identityVerification: {
            status: {
                type: String,
                enum: ["unverified", "pending", "verified", "rejected"],
                default: "unverified",
                index: true,
            },
            verifiedAt: { type: Date },
            verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
            sourceRequestId: { type: Schema.Types.ObjectId, ref: "ArtistRequest" },
            note: { type: String, default: "", trim: true },
        },

        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date },
        deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
        deleteReason: { type: String, default: "", trim: true },
    },
    { timestamps: true }
);

ArtistSchema.pre("validate", function setArtistNameKey(next) {
    if (this.isModified("name") || !this.nameKey) {
        this.nameKey = normalizeArtistName(this.name);
    }
    next();
});

// This index is partial so legacy documents without a backfilled key do not
// make application startup fail. Run the read-only audit/backfill migration
// before deploying data that can contain those legacy records.
ArtistSchema.index(
    { nameKey: 1 },
    {
        unique: true,
        name: "unique_active_artist_name_key",
        partialFilterExpression: {
            isDeleted: { $in: [false, null] },
            nameKey: { $type: "string" },
        },
    }
);

const Artist = model("Artist", ArtistSchema);
export default Artist;
