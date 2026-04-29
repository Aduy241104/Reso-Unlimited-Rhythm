import mongoose from "mongoose";

const { Schema, model } = mongoose;

const SubscriptionSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true, index: true },

        status: {
            type: String,
            enum: ["pending", "active", "cancelled", "expired"],
            default: "pending",
            index: true,
        },
        startDate: { type: Date },
        endDate: { type: Date },
        autoRenew: { type: Boolean, default: false },
    },
    { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, planId: 1, status: 1 });

const Subscription = model("Subscription", SubscriptionSchema);

export default Subscription;
