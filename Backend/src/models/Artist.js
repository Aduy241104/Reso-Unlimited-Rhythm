import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ArtistSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },

        name: { type: String, required: true, trim: true, index: true },
        bio: { type: String, default: "" },
        avatar: { type: String, default: "" },
        coverImage: { type: String, default: "" },

        socialLinks: {
            facebook: { type: String, default: "" },
            instagram: { type: String, default: "" },
            youtube: { type: String, default: "" },
        },

        verificationStatus: {
            type: String,
            enum: ["pending", "verified", "rejected"],
            default: "pending",
            index: true,
        },

        stats: {
            followers: { type: Number, default: 0, min: 0 },
            totalStreams: { type: Number, default: 0, min: 0 },
            monthlyListeners: { type: Number, default: 0, min: 0 },
        },

        revenue: {
            totalEarnedAmount: Number,
            totalWithdrawnAmount: Number,
            availableAmount: Number,
            pendingPayoutAmount: Number,
            confirmedRevenueSummaryIds: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "ArtistRevenueSummary",
                },
            ],
        },

        payoutAccounts: [
            {
                bankName: { type: String, trim: true, required: true },
                accountNumber: { type: String, trim: true, required: true },
                accountHolderName: { type: String, trim: true, required: true },
                isDefault: { type: Boolean, default: false },
            },
        ],

        withdrawalSecurity: {
            passwordHash: { type: String, default: "" },
        },

        activeStatus: {
            type: String,
            enum: ["active", "inactive", "blocked"],
            default: "active",
            index: true,
        },

        blockedReason: { type: String, default: "" },
    },
    { timestamps: true }
);

const Artist = model("Artist", ArtistSchema);
export default Artist;
