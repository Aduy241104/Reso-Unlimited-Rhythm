import dotenv from "dotenv";
import mongoose from "mongoose";
import models from "./models/index.js";

dotenv.config();

const { Plan, Subscription, User } = models;

const oid = (value) => new mongoose.Types.ObjectId(value);
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const ids = {
    planPremium: oid("6813ffff0000000000000001"),
    premiumUser: oid("6813ffff0000000000000101"),
    premiumSubscription: oid("6813ffff0000000000000201"),
};

const premiumUserSeed = {
    email: "premium.seed@reso.local",
    password: "$2b$10$M8a7Haih7bnuLDyLp0m/7e8eioTIVl82tHJOzYQWM89EnUe5B3BKm",
    authProvider: "local",
    role: "user",
    activeStatus: "active",
    emailVerified: true,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    profile: {
        fullName: "Premium Seed User",
        gender: "prefer_not_to_say",
        dateOfBirth: new Date("2000-01-01"),
        country: "Vietnam",
    },
    settings: {
        language: "vi",
        notificationsEnabled: true,
        shufflePlayDefault: false,
    },
    stats: {
        totalListeningTime: 0,
        totalTracksPlayed: 0,
    },
};

const premiumPlanSeed = {
    name: "Seed Premium Single User",
    price: 99000,
    durationDays: 30,
    description: "Goi premium seed danh rieng cho tai khoan test.",
    features: [
        "NO_ADS",
        "HIGH_QUALITY_AUDIO",
        "LOSSLESS_AUDIO",
        "UNLIMITED_SKIP",
        "OFFLINE_DOWNLOAD",
        "BACKGROUND_PLAY",
        "AI_SMART_PLAYLIST",
        "ADVANCED_RECOMMENDATION",
    ],
    status: "active",
};

const premiumEndDate = () => new Date(Date.now() + 30 * DAY_IN_MS);

const connectDatabase = async () => {
    if (!process.env.DATABASE) {
        throw new Error("Missing DATABASE in .env");
    }

    await mongoose.connect(process.env.DATABASE);
};

const seedPlan = async () => {
    await Plan.findOneAndUpdate(
        { _id: ids.planPremium },
        {
            $set: premiumPlanSeed,
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );
};

const seedUser = async () => {
    await User.findOneAndUpdate(
        { email: premiumUserSeed.email },
        {
            $set: {
                ...premiumUserSeed,
                subscription: {
                    isPremium: true,
                    currentPlanId: ids.planPremium,
                    premiumEndDate: premiumEndDate(),
                },
            },
            $setOnInsert: {
                _id: ids.premiumUser,
            },
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );
};

const seedSubscription = async () => {
    const user = await User.findOne({ email: premiumUserSeed.email }).select("_id");

    if (!user) {
        throw new Error("Premium seed user was not created.");
    }

    await Subscription.deleteMany({
        userId: user._id,
        _id: { $ne: ids.premiumSubscription },
    });

    await Subscription.findOneAndUpdate(
        { _id: ids.premiumSubscription },
        {
            $set: {
                userId: user._id,
                planId: ids.planPremium,
                status: "active",
                startDate: new Date(),
                endDate: premiumEndDate(),
                autoRenew: true,
            },
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );
};

const main = async () => {
    await connectDatabase();
    await seedPlan();
    await seedUser();
    await seedSubscription();

    console.log("Premium user seed completed successfully.");
    console.log(`Email: ${premiumUserSeed.email}`);
    console.log("Password: use the plaintext value that matches the provided bcrypt hash.");
};

main()
    .catch((error) => {
        console.error("Premium user seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
