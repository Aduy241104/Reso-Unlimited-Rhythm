import mongoose from "mongoose";

const { Schema, model } = mongoose;

const UserSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
            index: true,
        },

        password: {
            type: String,
            required: function () {
                return this.authProvider === "local";
            },
        },

        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local",
            index: true,
        },

        googleId: {
            type: String,
            trim: true,
            sparse: true,
            index: true,
        },

        avatar: { type: String, default: "" },

        role: {
            type: String,
            enum: ["user", "artist", "admin"],
            default: "user",
            index: true,
        },

        activeStatus: {
            type: String,
            enum: ["active", "inactive", "blocked"],
            default: "active",
            index: true,
        },

        emailVerified: {
            type: Boolean,
            default: false,
            index: true,
        },

        profile: {
            fullName: { type: String, trim: true, default: "" },
            gender: {
                type: String,
                enum: ["male", "female", "other", "prefer_not_to_say"],
                default: "prefer_not_to_say",
            },
            dateOfBirth: { type: Date },
            country: { type: String, trim: true, default: "" },
        },

        settings: {
            language: { type: String, default: "vi" },
            notificationsEnabled: { type: Boolean, default: true },
            shufflePlayDefault: { type: Boolean, default: false },
        },

        subscription: {
            isPremium: { type: Boolean, default: false, index: true },
            currentPlanId: { type: Schema.Types.ObjectId, ref: "Plan", index: true },
            premiumEndDate: { type: Date },
        },

        stats: {
            totalListeningTime: { type: Number, default: 0, min: 0 },
            totalTracksPlayed: { type: Number, default: 0, min: 0 },
        },
    },
    { timestamps: true }
);

const User = model("User", UserSchema);
export default User;