import mongoose from "mongoose";

const { Schema, model } = mongoose;

const WithdrawalRequestSchema = new Schema(
    {
        artistId: {
            type: Schema.Types.ObjectId,
            ref: "Artist",
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        method: {
            type: String,
            enum: ["bank", "momo"],
            required: true,
            index: true,
        },
        accountInfo: {
            bankName: {
                type: String,
                trim: true,
                default: "",
            },
            accountNumber: {
                type: String,
                trim: true,
                default: "",
            },
            accountHolderName: {
                type: String,
                trim: true,
                default: "",
            },
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "paid"],
            default: "pending",
            index: true,
        },
        requestedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        processedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        processedAt: {
            type: Date,
            default: null,
        },
        approvedAt: {
            type: Date,
            default: null,
        },
        adminNote: {
            type: String,
            default: "",
        },
        rejectReason: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

WithdrawalRequestSchema.index({ artistId: 1, status: 1 });
WithdrawalRequestSchema.index({ status: 1, requestedAt: -1 });

export default model("WithdrawalRequest", WithdrawalRequestSchema);
