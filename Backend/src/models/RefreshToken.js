import mongoose from "mongoose";
import {
    AUTH_CLIENT_TYPE_VALUES,
    DEFAULT_AUTH_CLIENT_TYPE,
} from "../constants/authClientTypes.js";

const { Schema, model } = mongoose;

const RefreshTokenSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        clientType: {
            type: String,
            enum: AUTH_CLIENT_TYPE_VALUES,
            required: true,
            default: DEFAULT_AUTH_CLIENT_TYPE,
            index: true,
        },
        token: { type: String, required: true, unique: true, index: true },
        expiresAt: { type: Date, required: true, index: true },
        isRevoked: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

RefreshTokenSchema.index({ userId: 1, clientType: 1, isRevoked: 1 });

const RefreshToken = model("RefreshToken", RefreshTokenSchema);

export default RefreshToken;
    
