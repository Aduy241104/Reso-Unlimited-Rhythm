import mongoose from "mongoose";

const { Schema, model } = mongoose;

export const PLAN_FEATURES = [
    "NO_ADS",
    "HIGH_QUALITY_AUDIO",
    "LOSSLESS_AUDIO",
    "UNLIMITED_SKIP",
    "OFFLINE_DOWNLOAD",
    "BACKGROUND_PLAY",
    "AI_SMART_PLAYLIST",
    "ADVANCED_RECOMMENDATION",
    "EARLY_ACCESS",
    "EXCLUSIVE_CONTENT",
];

const PlanSchema = new Schema(
    {
        name: { type: String, required: true, trim: true, unique: true, index: true },
        price: { type: Number, required: true, min: 0 },
        durationDays: { type: Number, required: true, min: 1 },
        description: { type: String, default: "" },
        features: [
            {
                type: String,
                enum: PLAN_FEATURES,
            },
        ],
        status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    },
    { timestamps: true }
);

const Plan = model("Plan", PlanSchema);

export default Plan;
