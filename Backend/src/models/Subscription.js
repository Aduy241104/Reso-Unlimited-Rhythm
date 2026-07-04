import mongoose from "mongoose";
import { PLAN_FEATURES } from "./Plan.js";

const { Schema, model } = mongoose;

const PlanSnapshotSchema = new Schema(
    {
        originalPlanId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        durationDays: { type: Number, required: true, min: 1 },
        description: { type: String, default: "" },
        features: [
            {
                type: String,
                enum: PLAN_FEATURES,
            },
        ],
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
    },
    { _id: false }
);

const SubscriptionSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true, index: true },
        planSnapshot: { type: PlanSnapshotSchema, required: true },

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

export { PlanSnapshotSchema };
export default Subscription;
