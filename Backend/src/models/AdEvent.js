import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AdEventSchema = new Schema(
    {
        advertisementId: { type: Schema.Types.ObjectId, ref: "Advertisement", required: true, index: true },
        type: {
            type: String,
            enum: ["started", "impression", "click", "complete", "skip"],
            required: true,
            index: true,
        },
        adType: { type: String, enum: ["banner", "audio"], required: true, index: true },
        sessionHash: { type: String, required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
        decisionId: { type: String, required: true, index: true },
        dedupeKey: { type: String, required: true, unique: true },
        placement: { type: String, default: "", trim: true },
        playedSeconds: { type: Number, min: 0, default: 0 },
        metadata: { type: Schema.Types.Mixed, default: {} },
        occurredAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

AdEventSchema.index({ advertisementId: 1, type: 1, occurredAt: -1 });
AdEventSchema.index({ sessionHash: 1, occurredAt: -1 });
AdEventSchema.index({ adType: 1, occurredAt: -1 });
AdEventSchema.index({ occurredAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 * 2 });

const AdEvent = model("AdEvent", AdEventSchema);
export default AdEvent;
