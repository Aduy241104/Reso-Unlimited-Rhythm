import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ArtistVerificationRequestSchema = new Schema(
    {
        artistId: {
            type: Schema.Types.ObjectId,
            ref: "Artist",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["open", "closed"],
            default: "open",
            index: true,
        },
        note: { type: String, default: "", trim: true, maxlength: 2000 },
    },
    { timestamps: true }
);

ArtistVerificationRequestSchema.index({ artistId: 1, status: 1 });

export default model("ArtistVerificationRequest", ArtistVerificationRequestSchema);
