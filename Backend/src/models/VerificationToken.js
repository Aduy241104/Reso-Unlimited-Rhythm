import mongoose from "mongoose";

const { Schema, model } = mongoose;

const VerificationTokenSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
        email: { type: String, trim: true, lowercase: true, index: true },
        token: { type: String, required: true, unique: true, index: true },
        otp: { type: String, trim: true, index: true },
        type: { type: String, enum: ["reset_password", "verify_email"], required: true, index: true },
        expiresAt: { type: Date, required: true, index: true },
        isUsed: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

const VerificationToken = model("VerificationToken", VerificationTokenSchema);

export default VerificationToken;
