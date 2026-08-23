import mongoose from "mongoose";

const { Schema, model } = mongoose;

const FrequencyCapSchema = new Schema(
    {
        maxPerHour: { type: Number, min: 1, max: 60, default: 4 },
        minTracksBetweenAds: { type: Number, min: 0, max: 100, default: 3 },
        minMinutesBetweenAds: { type: Number, min: 0, max: 1440, default: 8 },
    },
    { _id: false }
);

const AdvertisementSchema = new Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 180 },
        advertiserName: { type: String, required: true, trim: true, maxlength: 180 },
        type: { type: String, enum: ["audio"], required: true, index: true },
        status: {
            type: String,
            enum: ["draft", "active", "paused", "expired", "archived"],
            default: "draft",
            index: true,
        },
        mediaUrl: { type: String, required: true, trim: true, maxlength: 2000 },
        thumbnailUrl: { type: String, default: "", trim: true, maxlength: 2000 },
        clickUrl: { type: String, default: "", trim: true, maxlength: 2000 },
        startAt: { type: Date, required: true, index: true },
        endAt: { type: Date, required: true, index: true },
        priority: { type: Number, min: 1, max: 100, default: 1 },
        targeting: {
            genres: [{ type: Schema.Types.ObjectId, ref: "Genre" }],
            countries: [{ type: String, trim: true, uppercase: true, maxlength: 2 }],
            placements: [{ type: String, enum: ["between_tracks", "before_track"], trim: true, lowercase: true, maxlength: 60 }],
        },
        frequencyCap: { type: FrequencyCapSchema, default: () => ({}) },
        skipEnabled: { type: Boolean, default: true },
        skipAfterSeconds: { type: Number, min: 0, max: 3600, default: 5 },
        duration: { type: Number, min: 0, max: 3600, default: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        archivedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

AdvertisementSchema.index({ status: 1, type: 1, startAt: 1, endAt: 1 });
AdvertisementSchema.index({ type: 1, priority: -1, updatedAt: -1 });

const Advertisement = model("Advertisement", AdvertisementSchema);
export default Advertisement;
