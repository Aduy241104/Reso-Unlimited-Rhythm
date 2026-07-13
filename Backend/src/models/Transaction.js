import mongoose from "mongoose";

const { Schema, model } = mongoose;

const TransactionSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription", index: true },
        planId: { type: Schema.Types.ObjectId, ref: "Plan", index: true },

        amount: { type: Number, required: true, min: 0 },
        tax: { type: Number, default: 0, min: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: "VND", trim: true },

        paymentMethod: { type: String, enum: ["momo", "vnpay", "stripe", "card"], required: true, index: true },
        paymentGateway: { type: String, enum: ["momo", "vnpay", "stripe"], required: true, index: true },
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
    },
    { timestamps: true }
);

const Transaction = model("Transaction", TransactionSchema);

export default Transaction;
    
