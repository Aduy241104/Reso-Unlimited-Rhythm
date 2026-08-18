import dotenv from "dotenv";
import mongoose from "mongoose";
import connectMongoose from "../src/config/db.js";
import RevenuePeriod from "../src/models/RevenuePeriod.js";

dotenv.config();

const SEED_PREFIX = "7c";
const DEMO_YEAR = 2024;
const DEMO_MONTHS = [1, 2, 3, 4, 5];

const seedObjectId = (month) =>
    new mongoose.Types.ObjectId(
        `${SEED_PREFIX}${month.toString(16).padStart(2, "0")}${"0".repeat(20)}`
    );

const buildPeriodDates = (year, month) => ({
    periodStart: new Date(Date.UTC(year, month - 1, 1)),
    periodEnd: new Date(Date.UTC(year, month, 1)),
});

const seedOpenRevenuePeriods = async () => {
    const createdPeriods = [];
    const skippedPeriods = [];

    for (const month of DEMO_MONTHS) {
        const existing = await RevenuePeriod.findOne({
            year: DEMO_YEAR,
            month,
        })
            .select("_id year month status")
            .lean();

        if (existing) {
            skippedPeriods.push(`${DEMO_YEAR}-${String(month).padStart(2, "0")}`);
            continue;
        }

        const { periodStart, periodEnd } = buildPeriodDates(DEMO_YEAR, month);

        await RevenuePeriod.create({
            _id: seedObjectId(month),
            year: DEMO_YEAR,
            month,
            periodStart,
            periodEnd,
            status: "open",
            totalPremiumRevenue: 0,
            totalArtistPool: 0,
            totalPlatformRevenue: 0,
            totalEligibleStreams: 0,
            successfulTransactions: 0,
            dailyStats: [],
            lastAggregatedAt: null,
            closedAt: null,
            calculatedAt: null,
            confirmedAt: null,
            confirmedBy: null,
        });

        createdPeriods.push(`${DEMO_YEAR}-${String(month).padStart(2, "0")}`);
    }

    console.log("Open revenue periods seed completed.");
    console.log(`Created: ${createdPeriods.join(", ") || "none"}`);
    console.log(`Skipped existing: ${skippedPeriods.join(", ") || "none"}`);
};

await connectMongoose();

try {
    await seedOpenRevenuePeriods();
} catch (error) {
    console.error("Open revenue periods seed failed:", error);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
