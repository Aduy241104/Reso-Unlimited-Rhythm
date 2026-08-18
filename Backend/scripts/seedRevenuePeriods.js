import dotenv from "dotenv";
import mongoose from "mongoose";
import connectMongoose from "../src/config/db.js";
import RevenuePeriod from "../src/models/RevenuePeriod.js";

dotenv.config();

const ARTIST_REVENUE_SHARE_RATIO = 0.6;
const PLATFORM_REVENUE_SHARE_RATIO = 0.4;
const MIN_REVENUE_YEAR = 2000;
const DRY_RUN = process.argv.includes("--dry-run");

const readOption = (name) => {
    const prefix = `${name}=`;
    const argument = process.argv.find((value) => value.startsWith(prefix));

    return argument ? argument.slice(prefix.length) : null;
};

const roundCurrency = (value) => Math.max(0, Math.round(Number(value) || 0));

const parsePeriod = (value) => {
    const match = String(value || "").trim().match(/^(\d{4})-(\d{1,2})$/);
    const year = Number(match?.[1]);
    const month = Number(match?.[2]);

    if (!match || year < MIN_REVENUE_YEAR || month < 1 || month > 12) {
        throw new Error(
            `Invalid period "${value}". Expected format YYYY-MM, for example 2026-08.`
        );
    }

    return { year, month };
};

const resolvePeriodSelection = () => {
    const hasAllOption = process.argv.includes("--all");
    const periodsOption = readOption("--periods") || readOption("--period");

    if (hasAllOption && periodsOption) {
        throw new Error("Use either --all or --periods=YYYY-MM,..., not both.");
    }

    if (hasAllOption) {
        return { filter: {}, label: "all existing revenue periods" };
    }

    if (!periodsOption) {
        throw new Error(
            "Specify the target periods with --periods=YYYY-MM,... or use --all."
        );
    }

    const periods = [...new Set(periodsOption.split(",").map((value) => {
        const period = parsePeriod(value);
        return `${period.year}-${String(period.month).padStart(2, "0")}`;
    }))].map(parsePeriod);

    return {
        filter: { $or: periods },
        label: periods
            .map(({ year, month }) => `${year}-${String(month).padStart(2, "0")}`)
            .join(", "),
    };
};

const buildRevenuePeriodShareUpdate = (revenuePeriod) => {
    const totalPremiumRevenue = roundCurrency(revenuePeriod.totalPremiumRevenue);
    const totalArtistPool = roundCurrency(
        totalPremiumRevenue * ARTIST_REVENUE_SHARE_RATIO
    );
    const totalPlatformRevenue = roundCurrency(
        totalPremiumRevenue * PLATFORM_REVENUE_SHARE_RATIO
    );
    const dailyStats = Array.isArray(revenuePeriod.dailyStats)
        ? revenuePeriod.dailyStats.map((dailyStat) => {
              const premiumRevenue = roundCurrency(dailyStat.premiumRevenue);

              return {
                  ...dailyStat,
                  artistPool: roundCurrency(
                      premiumRevenue * ARTIST_REVENUE_SHARE_RATIO
                  ),
                  platformRevenue: roundCurrency(
                      premiumRevenue * PLATFORM_REVENUE_SHARE_RATIO
                  ),
              };
          })
        : [];

    return {
        totalArtistPool,
        totalPlatformRevenue,
        dailyStats,
    };
};

const formatPeriod = (revenuePeriod) =>
    `${revenuePeriod.year}-${String(revenuePeriod.month).padStart(2, "0")}`;

const seedRevenuePeriods = async () => {
    const selection = resolvePeriodSelection();
    const revenuePeriods = await RevenuePeriod.find(selection.filter)
        .sort({ year: 1, month: 1 })
        .lean();

    if (revenuePeriods.length === 0) {
        console.log(`No existing RevenuePeriod records found for ${selection.label}.`);
        return;
    }

    const operations = revenuePeriods.map((revenuePeriod) => ({
        updateOne: {
            filter: { _id: revenuePeriod._id },
            update: { $set: buildRevenuePeriodShareUpdate(revenuePeriod) },
        },
    }));

    console.log(
        `Target: ${selection.label}. Found ${revenuePeriods.length} RevenuePeriod record(s).`
    );
    console.log("Share: artist 60% / platform 40%.");

    for (const revenuePeriod of revenuePeriods) {
        const update = buildRevenuePeriodShareUpdate(revenuePeriod);
        console.log(
            `${formatPeriod(revenuePeriod)}: ${revenuePeriod.totalPremiumRevenue || 0} -> ` +
                `artist ${update.totalArtistPool}, platform ${update.totalPlatformRevenue}`
        );
    }

    if (DRY_RUN) {
        console.log("Dry run completed. MongoDB was not changed.");
        return;
    }

    const result = await RevenuePeriod.bulkWrite(operations, { ordered: true });
    console.log(
        `Updated ${result.modifiedCount || 0} RevenuePeriod record(s). ` +
            "No other collection was modified."
    );
};

await connectMongoose();

try {
    await seedRevenuePeriods();
} catch (error) {
    console.error("Revenue period seed failed:", error.message);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
