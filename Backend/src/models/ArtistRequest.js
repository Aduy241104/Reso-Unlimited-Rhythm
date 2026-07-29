import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ArtistRequestSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        stageName: { type: String, required: true, trim: true },
        bio: { type: String, default: "" },
        avatar: { type: String, trim: true, default: "" },
        genres: [{ type: String, trim: true }],

        socialLinks: {
            spotify: { type: String, default: "" },
            youtube: { type: String, default: "" },
            tiktok: { type: String, default: "" },
            facebook: { type: String, default: "" },
            instagram: { type: String, default: "" },
            soundcloud: { type: String, default: "" },
            website: { type: String, default: "" },
            other: { type: String, default: "" },
        },

        identityInfo: {
            idNumber: { type: String, required: true, trim: true }, // số CCCD
            fullName: { type: String, required: true, trim: true }, // họ tên trên CCCD
            dateOfBirth: { type: Date },
            frontImage: { type: String, required: true }, // ảnh mặt trước CCCD
            backImage: { type: String, required: true },  // ảnh mặt sau CCCD
        },

        portfolio: {
            demoTrackUrls: [{ type: String, trim: true }],
            musicLinks: [{ type: String, trim: true }],
            description: { type: String, default: "" }
        },

        artistDeclaration: {
            acceptedTerms: { type: Boolean, default: false },
            copyrightCommitment: { type: Boolean, default: false },
            truthfulInformationCommitment: { type: Boolean, default: false },
            acceptedAt: { type: Date, default: null }
        },

        review: {
            adminNote: { type: String, default: "" },

            checklist: {
                profileComplete: { type: Boolean, default: false },
                identityVerified: { type: Boolean, default: false },
                hasMusicActivity: { type: Boolean, default: false },
                socialLinksValid: { type: Boolean, default: false },
                noImpersonation: { type: Boolean, default: false },
                acceptedCopyrightPolicy: { type: Boolean, default: false }
            }
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true,
        },

        reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reviewedAt: { type: Date },
        rejectReason: { type: String, default: "" },
    },
    { timestamps: true }
);

export default model("ArtistRequest", ArtistRequestSchema);