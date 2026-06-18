import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import models from "./models/index.js";
import {
    ARTIST_REVENUE_SHARE_PERCENT,
    PLATFORM_REVENUE_SHARE_PERCENT,
    buildRevenuePeriodRange,
    getRevenueDashboardTimezone,
} from "./helpers/revenuePeriod.helper.js";

dotenv.config();

dayjs.extend(utc);
dayjs.extend(timezone);

const { User, Artist, RevenuePeriod, ArtistRevenueSummary } = models;

const oid = (value) => new mongoose.Types.ObjectId(value);

const ids = {
    adminUser: oid("682900000000000000000001"),

    artistUserOne: oid("682900000000000000000011"),
    artistUserTwo: oid("682900000000000000000012"),
    artistUserThree: oid("682900000000000000000013"),
    artistUserFour: oid("682900000000000000000014"),

    artistOne: oid("682900000000000000000101"),
    artistTwo: oid("682900000000000000000102"),
    artistThree: oid("682900000000000000000103"),
    artistFour: oid("682900000000000000000104"),

    revenuePeriodCurrent: oid("682900000000000000000201"),
    revenuePeriodLastMonth: oid("682900000000000000000202"),
    revenuePeriodTwoMonthsAgo: oid("682900000000000000000203"),
    revenuePeriodThreeMonthsAgo: oid("682900000000000000000204"),

    summaryLastMonthArtistOne: oid("682900000000000000000301"),
    summaryLastMonthArtistTwo: oid("682900000000000000000302"),
    summaryLastMonthArtistThree: oid("682900000000000000000303"),
    summaryLastMonthArtistFour: oid("682900000000000000000304"),

    summaryTwoMonthsAgoArtistOne: oid("682900000000000000000311"),
    summaryTwoMonthsAgoArtistTwo: oid("682900000000000000000312"),
    summaryTwoMonthsAgoArtistThree: oid("682900000000000000000313"),

    summaryThreeMonthsAgoArtistTwo: oid("682900000000000000000321"),
};

const seedCollections = [
    {
        model: ArtistRevenueSummary,
        ids: [
            ids.summaryLastMonthArtistOne,
            ids.summaryLastMonthArtistTwo,
            ids.summaryLastMonthArtistThree,
            ids.summaryLastMonthArtistFour,
            ids.summaryTwoMonthsAgoArtistOne,
            ids.summaryTwoMonthsAgoArtistTwo,
            ids.summaryTwoMonthsAgoArtistThree,
            ids.summaryThreeMonthsAgoArtistTwo,
        ],
    },
    {
        model: RevenuePeriod,
        ids: [
            ids.revenuePeriodCurrent,
            ids.revenuePeriodLastMonth,
            ids.revenuePeriodTwoMonthsAgo,
            ids.revenuePeriodThreeMonthsAgo,
        ],
    },
    {
        model: Artist,
        ids: [ids.artistOne, ids.artistTwo, ids.artistThree, ids.artistFour],
    },
    {
        model: User,
        ids: [
            ids.adminUser,
            ids.artistUserOne,
            ids.artistUserTwo,
            ids.artistUserThree,
            ids.artistUserFour,
        ],
    },
];

const buildMonthContext = (offsetMonths, timezoneName) => {
    const monthDate = dayjs().tz(timezoneName).startOf("month").subtract(offsetMonths, "month");
    const year = monthDate.year();
    const month = monthDate.month() + 1;
    const { periodStart, periodEnd } = buildRevenuePeriodRange(year, month, timezoneName);

    return {
        year,
        month,
        periodStart,
        periodEnd,
        monthDate,
    };
};

const createDailyStats = ({
    year,
    month,
    timezoneName,
    totalPremiumRevenue,
    totalArtistPool,
    totalPlatformRevenue,
    successfulTransactions,
}) => {
    const dailyRatios = [0.16, 0.21, 0.19, 0.24, 0.2];

    const premiumParts = dailyRatios.map((ratio) =>
        Math.round(totalPremiumRevenue * ratio)
    );
    premiumParts[premiumParts.length - 1] +=
        totalPremiumRevenue - premiumParts.reduce((sum, value) => sum + value, 0);

    const artistParts = dailyRatios.map((ratio) =>
        Math.round(totalArtistPool * ratio)
    );
    artistParts[artistParts.length - 1] +=
        totalArtistPool - artistParts.reduce((sum, value) => sum + value, 0);

    const platformParts = dailyRatios.map((ratio) =>
        Math.round(totalPlatformRevenue * ratio)
    );
    platformParts[platformParts.length - 1] +=
        totalPlatformRevenue - platformParts.reduce((sum, value) => sum + value, 0);

    const transactionParts = dailyRatios.map((ratio) =>
        Math.round(successfulTransactions * ratio)
    );
    transactionParts[transactionParts.length - 1] +=
        successfulTransactions -
        transactionParts.reduce((sum, value) => sum + value, 0);

    return dailyRatios.map((_, index) => {
        const date = dayjs()
            .tz(timezoneName)
            .year(year)
            .month(month - 1)
            .date(index + 2)
            .startOf("day");

        return {
            day: date.date(),
            date: date.toDate(),
            premiumRevenue: premiumParts[index],
            artistPool: artistParts[index],
            platformRevenue: platformParts[index],
            successfulTransactions: transactionParts[index],
        };
    });
};

const connectDatabase = async () => {
    if (!process.env.DATABASE) {
        throw new Error("Missing DATABASE in .env");
    }

    mongoose.set("autoIndex", false);
    await mongoose.connect(process.env.DATABASE);
};

const ensureIndexes = async () => {
    for (const { model } of seedCollections) {
        await model.init();
    }
};

const cleanupSeedData = async () => {
    for (const entry of seedCollections) {
        await entry.model.deleteMany({ _id: { $in: entry.ids } });
    }
};

const buildPasswords = async () => ({
    admin: await bcrypt.hash("Admin@123", 10),
    artist: await bcrypt.hash("Artist@123", 10),
});

const seedUsers = async (passwords) => {
    await User.insertMany([
        {
            _id: ids.adminUser,
            email: "admin.revenue.seed@reso.local",
            password: passwords.admin,
            role: "admin",
            activeStatus: "active",
            emailVerified: true,
            profile: {
                fullName: "Revenue Seed Admin",
                gender: "other",
                country: "Vietnam",
            },
        },
        {
            _id: ids.artistUserOne,
            email: "artist.one.seed@reso.local",
            password: passwords.artist,
            role: "artist",
            activeStatus: "active",
            emailVerified: true,
            profile: {
                fullName: "Lunar Echo",
                gender: "female",
                country: "Vietnam",
            },
        },
        {
            _id: ids.artistUserTwo,
            email: "artist.two.seed@reso.local",
            password: passwords.artist,
            role: "artist",
            activeStatus: "active",
            emailVerified: true,
            profile: {
                fullName: "Neon Drift",
                gender: "male",
                country: "Vietnam",
            },
        },
        {
            _id: ids.artistUserThree,
            email: "artist.three.seed@reso.local",
            password: passwords.artist,
            role: "artist",
            activeStatus: "active",
            emailVerified: true,
            profile: {
                fullName: "Velvet Pulse",
                gender: "female",
                country: "Vietnam",
            },
        },
        {
            _id: ids.artistUserFour,
            email: "artist.four.seed@reso.local",
            password: passwords.artist,
            role: "artist",
            activeStatus: "active",
            emailVerified: true,
            profile: {
                fullName: "Solar Tide",
                gender: "other",
                country: "Vietnam",
            },
        },
    ]);
};

const seedArtists = async () => {
    await Artist.insertMany([
        {
            _id: ids.artistOne,
            userId: ids.artistUserOne,
            name: "Lunar Echo",
            bio: "Artist seed cho test doanh thu ky cu.",
            avatar: "https://example.com/seed/lunar-echo.jpg",
            coverImage: "https://example.com/seed/lunar-echo-cover.jpg",
            verificationStatus: "verified",
            activeStatus: "active",
            stats: {
                followers: 18300,
                totalStreams: 452000,
                monthlyListeners: 88200,
            },
            revenue: {
                totalEarnedAmount: 3990000,
                totalWithdrawnAmount: 1200000,
                availableAmount: 2790000,
                pendingPayoutAmount: 0,
            },
        },
        {
            _id: ids.artistTwo,
            userId: ids.artistUserTwo,
            name: "Neon Drift",
            bio: "Artist seed co doanh thu on dinh qua nhieu ky.",
            avatar: "https://example.com/seed/neon-drift.jpg",
            coverImage: "https://example.com/seed/neon-drift-cover.jpg",
            verificationStatus: "verified",
            activeStatus: "active",
            stats: {
                followers: 12800,
                totalStreams: 318000,
                monthlyListeners: 62100,
            },
            revenue: {
                totalEarnedAmount: 3720000,
                totalWithdrawnAmount: 650000,
                availableAmount: 2530000,
                pendingPayoutAmount: 540000,
            },
        },
        {
            _id: ids.artistThree,
            userId: ids.artistUserThree,
            name: "Velvet Pulse",
            bio: "Artist seed phu hop de test detail ky da tinh toan.",
            avatar: "https://example.com/seed/velvet-pulse.jpg",
            coverImage: "https://example.com/seed/velvet-pulse-cover.jpg",
            verificationStatus: "verified",
            activeStatus: "active",
            stats: {
                followers: 9100,
                totalStreams: 226000,
                monthlyListeners: 40400,
            },
            revenue: {
                totalEarnedAmount: 3840000,
                totalWithdrawnAmount: 400000,
                availableAmount: 3440000,
                pendingPayoutAmount: 0,
            },
        },
        {
            _id: ids.artistFour,
            userId: ids.artistUserFour,
            name: "Solar Tide",
            bio: "Artist seed de test ky co trang thai paid.",
            avatar: "https://example.com/seed/solar-tide.jpg",
            coverImage: "https://example.com/seed/solar-tide-cover.jpg",
            verificationStatus: "verified",
            activeStatus: "active",
            stats: {
                followers: 7600,
                totalStreams: 188000,
                monthlyListeners: 35200,
            },
            revenue: {
                totalEarnedAmount: 990000,
                totalWithdrawnAmount: 300000,
                availableAmount: 690000,
                pendingPayoutAmount: 0,
            },
        },
    ]);
};

const buildRevenueSeedData = (timezoneName) => {
    const currentPeriod = buildMonthContext(0, timezoneName);
    const lastMonth = buildMonthContext(1, timezoneName);
    const twoMonthsAgo = buildMonthContext(2, timezoneName);
    const threeMonthsAgo = buildMonthContext(3, timezoneName);

    const revenuePeriods = [
        {
            _id: ids.revenuePeriodCurrent,
            year: currentPeriod.year,
            month: currentPeriod.month,
            periodStart: currentPeriod.periodStart,
            periodEnd: currentPeriod.periodEnd,
            status: "open",
            totalPremiumRevenue: 2400000,
            totalArtistPool: 1440000,
            totalPlatformRevenue: 960000,
            totalEligibleStreams: 36000,
            successfulTransactions: 26,
            dailyStats: createDailyStats({
                year: currentPeriod.year,
                month: currentPeriod.month,
                timezoneName,
                totalPremiumRevenue: 2400000,
                totalArtistPool: 1440000,
                totalPlatformRevenue: 960000,
                successfulTransactions: 26,
            }),
            lastAggregatedAt: currentPeriod.monthDate
                .date(12)
                .hour(9)
                .minute(15)
                .toDate(),
            createdAt: currentPeriod.monthDate.date(1).hour(1).toDate(),
            updatedAt: currentPeriod.monthDate.date(12).hour(9).minute(15).toDate(),
        },
        {
            _id: ids.revenuePeriodLastMonth,
            year: lastMonth.year,
            month: lastMonth.month,
            periodStart: lastMonth.periodStart,
            periodEnd: lastMonth.periodEnd,
            status: "confirmed",
            totalPremiumRevenue: 12000000,
            totalArtistPool: 7200000,
            totalPlatformRevenue: 4800000,
            totalEligibleStreams: 180000,
            successfulTransactions: 124,
            dailyStats: createDailyStats({
                year: lastMonth.year,
                month: lastMonth.month,
                timezoneName,
                totalPremiumRevenue: 12000000,
                totalArtistPool: 7200000,
                totalPlatformRevenue: 4800000,
                successfulTransactions: 124,
            }),
            lastAggregatedAt: lastMonth.monthDate.endOf("month").hour(23).minute(0).toDate(),
            closedAt: lastMonth.monthDate.endOf("month").hour(23).minute(30).toDate(),
            calculatedAt: lastMonth.monthDate.add(1, "month").date(2).hour(9).toDate(),
            confirmedAt: lastMonth.monthDate.add(1, "month").date(3).hour(14).toDate(),
            confirmedBy: ids.adminUser,
            createdAt: lastMonth.monthDate.date(1).hour(1).toDate(),
            updatedAt: lastMonth.monthDate.add(1, "month").date(3).hour(14).toDate(),
        },
        {
            _id: ids.revenuePeriodTwoMonthsAgo,
            year: twoMonthsAgo.year,
            month: twoMonthsAgo.month,
            periodStart: twoMonthsAgo.periodStart,
            periodEnd: twoMonthsAgo.periodEnd,
            status: "calculated",
            totalPremiumRevenue: 8000000,
            totalArtistPool: 4800000,
            totalPlatformRevenue: 3200000,
            totalEligibleStreams: 132000,
            successfulTransactions: 89,
            dailyStats: createDailyStats({
                year: twoMonthsAgo.year,
                month: twoMonthsAgo.month,
                timezoneName,
                totalPremiumRevenue: 8000000,
                totalArtistPool: 4800000,
                totalPlatformRevenue: 3200000,
                successfulTransactions: 89,
            }),
            lastAggregatedAt: twoMonthsAgo.monthDate.endOf("month").hour(22).minute(0).toDate(),
            closedAt: twoMonthsAgo.monthDate.endOf("month").hour(22).minute(15).toDate(),
            calculatedAt: twoMonthsAgo.monthDate.add(1, "month").date(1).hour(10).toDate(),
            createdAt: twoMonthsAgo.monthDate.date(1).hour(1).toDate(),
            updatedAt: twoMonthsAgo.monthDate.add(1, "month").date(1).hour(10).toDate(),
        },
        {
            _id: ids.revenuePeriodThreeMonthsAgo,
            year: threeMonthsAgo.year,
            month: threeMonthsAgo.month,
            periodStart: threeMonthsAgo.periodStart,
            periodEnd: threeMonthsAgo.periodEnd,
            status: "closed",
            totalPremiumRevenue: 5000000,
            totalArtistPool: 3000000,
            totalPlatformRevenue: 2000000,
            totalEligibleStreams: 91000,
            successfulTransactions: 57,
            dailyStats: createDailyStats({
                year: threeMonthsAgo.year,
                month: threeMonthsAgo.month,
                timezoneName,
                totalPremiumRevenue: 5000000,
                totalArtistPool: 3000000,
                totalPlatformRevenue: 2000000,
                successfulTransactions: 57,
            }),
            lastAggregatedAt: threeMonthsAgo.monthDate.endOf("month").hour(21).minute(45).toDate(),
            closedAt: threeMonthsAgo.monthDate.endOf("month").hour(22).minute(10).toDate(),
            createdAt: threeMonthsAgo.monthDate.date(1).hour(1).toDate(),
            updatedAt: threeMonthsAgo.monthDate.endOf("month").hour(22).minute(10).toDate(),
        },
    ];

    const artistRevenueSummaries = [
        {
            _id: ids.summaryLastMonthArtistOne,
            artistId: ids.artistOne,
            year: lastMonth.year,
            month: lastMonth.month,
            totalEligibleStreams: 62000,
            grossRevenueAmount: 4500000,
            artistRevenueAmount: 2700000,
            platformRevenueAmount: 1800000,
            withdrawnAmount: 700000,
            availableAmount: 2000000,
            status: "paid",
            calculatedAt: lastMonth.monthDate.add(1, "month").date(2).hour(9).toDate(),
            createdAt: lastMonth.monthDate.add(1, "month").date(2).hour(9).toDate(),
            updatedAt: lastMonth.monthDate.add(1, "month").date(4).hour(16).toDate(),
        },
        {
            _id: ids.summaryLastMonthArtistTwo,
            artistId: ids.artistTwo,
            year: lastMonth.year,
            month: lastMonth.month,
            totalEligibleStreams: 47000,
            grossRevenueAmount: 3300000,
            artistRevenueAmount: 1980000,
            platformRevenueAmount: 1320000,
            withdrawnAmount: 250000,
            availableAmount: 1730000,
            status: "calculated",
            calculatedAt: lastMonth.monthDate.add(1, "month").date(2).hour(9).toDate(),
            createdAt: lastMonth.monthDate.add(1, "month").date(2).hour(9).toDate(),
            updatedAt: lastMonth.monthDate.add(1, "month").date(2).hour(9).toDate(),
        },
        {
            _id: ids.summaryLastMonthArtistThree,
            artistId: ids.artistThree,
            year: lastMonth.year,
            month: lastMonth.month,
            totalEligibleStreams: 39000,
            grossRevenueAmount: 2550000,
            artistRevenueAmount: 1530000,
            platformRevenueAmount: 1020000,
            withdrawnAmount: 0,
            availableAmount: 1530000,
            status: "calculated",
            calculatedAt: lastMonth.monthDate.add(1, "month").date(2).hour(9).toDate(),
            createdAt: lastMonth.monthDate.add(1, "month").date(2).hour(9).toDate(),
            updatedAt: lastMonth.monthDate.add(1, "month").date(2).hour(9).toDate(),
        },
        {
            _id: ids.summaryLastMonthArtistFour,
            artistId: ids.artistFour,
            year: lastMonth.year,
            month: lastMonth.month,
            totalEligibleStreams: 32000,
            grossRevenueAmount: 1650000,
            artistRevenueAmount: 990000,
            platformRevenueAmount: 660000,
            withdrawnAmount: 300000,
            availableAmount: 690000,
            status: "paid",
            calculatedAt: lastMonth.monthDate.add(1, "month").date(2).hour(9).toDate(),
            createdAt: lastMonth.monthDate.add(1, "month").date(2).hour(9).toDate(),
            updatedAt: lastMonth.monthDate.add(1, "month").date(4).hour(16).toDate(),
        },
        {
            _id: ids.summaryTwoMonthsAgoArtistOne,
            artistId: ids.artistOne,
            year: twoMonthsAgo.year,
            month: twoMonthsAgo.month,
            totalEligibleStreams: 41000,
            grossRevenueAmount: 2150000,
            artistRevenueAmount: 1290000,
            platformRevenueAmount: 860000,
            withdrawnAmount: 500000,
            availableAmount: 790000,
            status: "paid",
            calculatedAt: twoMonthsAgo.monthDate.add(1, "month").date(1).hour(10).toDate(),
            createdAt: twoMonthsAgo.monthDate.add(1, "month").date(1).hour(10).toDate(),
            updatedAt: twoMonthsAgo.monthDate.add(1, "month").date(3).hour(15).toDate(),
        },
        {
            _id: ids.summaryTwoMonthsAgoArtistTwo,
            artistId: ids.artistTwo,
            year: twoMonthsAgo.year,
            month: twoMonthsAgo.month,
            totalEligibleStreams: 36000,
            grossRevenueAmount: 2000000,
            artistRevenueAmount: 1200000,
            platformRevenueAmount: 800000,
            withdrawnAmount: 400000,
            availableAmount: 800000,
            status: "paid",
            calculatedAt: twoMonthsAgo.monthDate.add(1, "month").date(1).hour(10).toDate(),
            createdAt: twoMonthsAgo.monthDate.add(1, "month").date(1).hour(10).toDate(),
            updatedAt: twoMonthsAgo.monthDate.add(1, "month").date(3).hour(15).toDate(),
        },
        {
            _id: ids.summaryTwoMonthsAgoArtistThree,
            artistId: ids.artistThree,
            year: twoMonthsAgo.year,
            month: twoMonthsAgo.month,
            totalEligibleStreams: 28000,
            grossRevenueAmount: 2750000,
            artistRevenueAmount: 2310000,
            platformRevenueAmount: 440000,
            withdrawnAmount: 400000,
            availableAmount: 1910000,
            status: "calculated",
            calculatedAt: twoMonthsAgo.monthDate.add(1, "month").date(1).hour(10).toDate(),
            createdAt: twoMonthsAgo.monthDate.add(1, "month").date(1).hour(10).toDate(),
            updatedAt: twoMonthsAgo.monthDate.add(1, "month").date(1).hour(10).toDate(),
        },
        {
            _id: ids.summaryThreeMonthsAgoArtistTwo,
            artistId: ids.artistTwo,
            year: threeMonthsAgo.year,
            month: threeMonthsAgo.month,
            totalEligibleStreams: 24000,
            grossRevenueAmount: 900000,
            artistRevenueAmount: 540000,
            platformRevenueAmount: 360000,
            withdrawnAmount: 0,
            availableAmount: 540000,
            status: "pending",
            calculatedAt: null,
            createdAt: threeMonthsAgo.monthDate.endOf("month").hour(20).toDate(),
            updatedAt: threeMonthsAgo.monthDate.endOf("month").hour(20).toDate(),
        },
    ];

    return { revenuePeriods, artistRevenueSummaries };
};

const seedRevenueData = async () => {
    const timezoneName = getRevenueDashboardTimezone();
    const { revenuePeriods, artistRevenueSummaries } = buildRevenueSeedData(timezoneName);

    await RevenuePeriod.insertMany(revenuePeriods);
    await ArtistRevenueSummary.insertMany(artistRevenueSummaries);

    return {
        timezoneName,
        revenuePeriods,
        artistRevenueSummaries,
    };
};

const main = async () => {
    const passwords = await buildPasswords();

    await connectDatabase();
    await ensureIndexes();
    await cleanupSeedData();
    await seedUsers(passwords);
    await seedArtists();
    const seededRevenueData = await seedRevenueData();

    console.log("Revenue history seed completed successfully.");
    console.log(`Timezone: ${seededRevenueData.timezoneName}`);
    console.log("Sample admin account:");
    console.log("  admin.revenue.seed@reso.local / Admin@123");
    console.log("Sample artist account:");
    console.log("  artist.one.seed@reso.local / Artist@123");
    console.log("Seeded revenue periods:");
    seededRevenueData.revenuePeriods
        .sort((first, second) =>
            first.year === second.year
                ? first.month - second.month
                : first.year - second.year
        )
        .forEach((period) => {
            console.log(
                `  ${String(period.month).padStart(2, "0")}/${period.year} - ${period.status}`
            );
        });
    console.log(
        `Official artist revenue summaries: ${
            seededRevenueData.artistRevenueSummaries.filter((item) =>
                ["calculated", "paid"].includes(item.status)
            ).length
        }`
    );
    console.log(
        `Revenue share ratio: artist ${ARTIST_REVENUE_SHARE_PERCENT}% / platform ${PLATFORM_REVENUE_SHARE_PERCENT}%`
    );
};

main()
    .catch((error) => {
        console.error("Revenue history seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
