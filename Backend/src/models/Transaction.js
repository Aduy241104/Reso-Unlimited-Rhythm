import mongoose from "mongoose";
import { PlanSnapshotSchema } from "./Subscription.js";

const { Schema, model } = mongoose;

const TransactionSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription", index: true },
        planId: { type: Schema.Types.ObjectId, ref: "Plan", index: true },
        // Optional for backward compatibility with transactions created before
        // immutable plan snapshots were introduced.
        planSnapshot: { type: PlanSnapshotSchema, default: undefined },

        amount: { type: Number, required: true, min: 0 },
        tax: { type: Number, default: 0, min: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: "VND", trim: true },

        paymentMethod: { type: String, enum: ["momo", "vnpay", "stripe", "card"], required: true, index: true },
        paymentGateway: { type: String, enum: ["momo", "vnpay", "stripe"], required: true, index: true },
        clientPlatform: { type: String, enum: ["web", "mobile"], default: "web", index: true },
        gatewayTransactionId: { type: String, trim: true, default: "", index: true },

        status: {
            type: String,
            enum: ["pending", "success", "failed", "refunded"],
            default: "pending",
            index: true,
        },

        paidAt: { type: Date },
        failedAt: { type: Date },
        failureReason: { type: String, default: "" },
        invoiceNumber: { type: String, trim: true, default: "", index: true },
        paymentUrl: { type: String, trim: true, default: "" },
        paymentExpiresAt: { type: Date, index: true },

        confirmationEmailStatus: {
            type: String,
            enum: ["pending", "sending", "sent", "failed"],
            default: "pending",
        },
        confirmationEmailSentAt: { type: Date, default: null },
        confirmationEmailLastAttemptAt: { type: Date, default: null },
        confirmationEmailError: { type: String, default: "" },
    },
    { timestamps: true }
);

TransactionSchema.index({
    userId: 1,
    planId: 1,
    paymentGateway: 1,
    clientPlatform: 1,
    status: 1,
    paymentExpiresAt: -1,
    createdAt: -1,
});

const Transaction = model("Transaction", TransactionSchema);

export default Transaction;
    
