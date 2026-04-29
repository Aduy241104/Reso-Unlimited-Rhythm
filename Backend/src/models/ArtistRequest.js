import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ArtistRequestSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

        stageName: { type: String, required: true, trim: true },
        bio: { type: String, default: "" },
        avatar: { type: String, default: "" },

        genres: [{ type: String }],
        country: { type: String, default: "" },

        socialLinks: {
            spotify: { type: String, default: "" },
            youtube: { type: String, default: "" },
            tiktok: { type: String, default: "" },
            facebook: { type: String, default: "" },
        },

        identityInfo: {
            idNumber: { type: String, required: true, trim: true }, // số CCCD
            fullName: { type: String, required: true, trim: true }, // họ tên trên CCCD
            dateOfBirth: { type: Date },
            frontImage: { type: String, required: true }, // ảnh mặt trước CCCD
            backImage: { type: String, required: true },  // ảnh mặt sau CCCD
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