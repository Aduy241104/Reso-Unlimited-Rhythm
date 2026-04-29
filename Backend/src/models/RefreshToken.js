import mongoose from "mongoose";

const { Schema, model } = mongoose;

const RefreshTokenSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        token: { type: String, required: true, unique: true, index: true },
        expiresAt: { type: Date, required: true, index: true },
        isRevoked: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

const RefreshToken = model("RefreshToken", RefreshTokenSchema);

export default RefreshToken;
    