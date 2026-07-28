import bcrypt from "bcrypt";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import models from "./models/index.js";

dotenv.config();
dayjs.extend(utc);
dayjs.extend(timezone);

const {
    Artist,
    ArtistRevenueSummary,
    ListenEvent,
    Plan,
    RevenuePeriod,
    Subscription,
    Track,
    TrackMonthlyStat,
    Transaction,
    User,
} = models;

const APPLY = process.argv.includes("--apply");
const TIMEZONE =
    process.env.ANALYTICS_TIMEZONE ||
    process.env.CRON_TIMEZONE ||
    "Asia/Ho_Chi_Minh";
const SEED_PASSWORD = process.env.MINI_REVENUE_SEED_PASSWORD || "Seed@123";
const OPEN_MONTH_INPUT = String(process.env.MINI_REVENUE_OPEN_MONTH || "").trim();

const seedId = (scope, index) =>
    new mongoose.Types.ObjectId(
        `7f${scope.toString(16).padStart(2, "0")}${index
            .toString(16)
            .padStart(20, "0")}`
    );

const ids = {
    plan: seedId(1, 1),
    users: [seedId(2, 1), seedId(2, 2), seedId(2, 3), seedId(2, 4)],
    artist: seedId(3, 1),
    tracks: [seedId(4, 1), seedId(4, 2)],
    subscriptions: [seedId(5, 1), seedId(5, 2)],
    transactions: [seedId(6, 1), seedId(6, 2)],
    listenEvents: Array.from({ length: 12 }, (_, index) => seedId(7, index + 1)),
    trackMonthlyStats: Array.from({ length: 4 }, (_, index) => seedId(8, index + 1)),
    revenuePeriods: [seedId(9, 1), seedId(9, 2)],
    revenueSummary: seedId(10, 1),
};

const roundCurrency = (value) => Math.max(0, Math.round(Number(value) || 0));

const resolveRevenueSharePercent = () => {
    const rawValue = Number(process.env.ARTIST_REVENUE_SHARE_PERCENT);

    if (!Number.isFinite(rawValue) || rawValue < 0) {
        return 60;
    }

    if (rawValue <= 1) {
        return Number((rawValue * 100).toFixed(2));
    }

    return rawValue <= 100 ? Number(rawValue.toFixed(2)) : 60;
};

const resolveOpenMonth = () => {
    const currentMonth = dayjs().tz(TIMEZONE).startOf("month");
    const candidate = OPEN_MONTH_INPUT
        ? dayjs.tz(`${OPEN_MONTH_INPUT}-01T00:00:00`, TIMEZONE)
        : currentMonth.subtract(4, "month");

    if (
        !candidate.isValid() ||
        !/^\d{4}-\d{2}$/.test(OPEN_MONTH_INPUT || candidate.format("YYYY-MM")) ||
        candidate.format("YYYY-MM") !== (OPEN_MONTH_INPUT || candidate.format("YYYY-MM"))
    ) {
        throw new Error(
            "MINI_REVENUE_OPEN_MONTH must use YYYY-MM format and contain a valid month."
        );
    }

    if (!candidate.isBefore(currentMonth, "month")) {
        throw new Error("The mini revenue open period must be a completed past month.");
    }

    return candidate.startOf("month");
};

const periodRange = (month) => ({
    periodStart: month.toDate(),
    periodEnd: month.add(1, "month").toDate(),
});

const buildListenEvent = ({
    id,
    userId,
    track,
    listenedAt,
    listenPercent = 60,
    valid = true,
}) => {
    const listenedDuration = Number(
        (track.duration * (listenPercent / 100)).toFixed(2)
    );

    return {
        _id: id,
        userId,
        trackId: track._id,
        artistId: ids.artist,
        listenedAt,
        trackDuration: track.duration,
        listenedDuration,
        listenPercent,
        dailyListenOrder: valid ? 1 : null,
        requiredPercent: valid ? 40 : null,
        source: "track_detail",
        isValidStream: valid,
        duration: listenedDuration,
        completed: valid,
        skipped: !valid,
        createdAt: listenedAt,
        updatedAt: listenedAt,
    };
};

const aggregateTrackStats = ({ events, month, tracks }) =>
    tracks.map((track) => {
        const trackEvents = events.filter(
            (event) =>
                String(event.trackId) === String(track._id) &&
                dayjs(event.listenedAt).isSame(month, "month")
        );
        const validEvents = trackEvents.filter((event) => event.isValidStream === true);

        return {
            trackId: track._id,
            playCount: validEvents.length,
            uniqueListeners: new Set(
                validEvents.map((event) => String(event.userId || event.guestId))
            ).size,
        };
    });

const buildSeedData = async () => {
    const openMonth = resolveOpenMonth();
    const confirmedMonth = openMonth.subtract(1, "month");
    const confirmedRange = periodRange(confirmedMonth);
    const openRange = periodRange(openMonth);
    const artistSharePercent = resolveRevenueSharePercent();
    const artistShareRatio = artistSharePercent / 100;
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    const planPrice = 100000;
    const confirmedArtistPool = roundCurrency(planPrice * artistShareRatio);
    const openArtistPool = roundCurrency(planPrice * artistShareRatio);
    const confirmedAt = confirmedMonth.add(1, "month").add(2, "day").toDate();
    const calculatedAt = confirmedMonth.add(1, "month").add(1, "day").toDate();
    const openAggregatedAt = openMonth.add(1, "month").add(1, "day").toDate();

    const plan = {
        _id: ids.plan,
        name: "Mini Revenue Isolated Plan",
        price: planPrice,
        durationDays: 30,
        description: "Small isolated plan used only by the mini revenue seed.",
        features: ["NO_ADS", "HIGH_QUALITY_AUDIO"],
        status: "active",
    };
    const planSnapshot = {
        originalPlanId: plan._id,
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays,
        description: plan.description,
        features: plan.features,
        status: plan.status,
    };
    const users = [
        {
            _id: ids.users[0],
            email: "mini.revenue.admin@reso.seed",
            password: passwordHash,
            authProvider: "local",
            role: "admin",
            activeStatus: "active",
            emailVerified: true,
            profile: { fullName: "Mini Revenue Admin", country: "Vietnam" },
        },
        {
            _id: ids.users[1],
            email: "mini.revenue.artist@reso.seed",
            password: passwordHash,
            authProvider: "local",
            role: "artist",
            activeStatus: "active",
            emailVerified: true,
            profile: { fullName: "Mini Revenue Artist", country: "Vietnam" },
        },
        {
            _id: ids.users[2],
            email: "mini.revenue.listener01@reso.seed",
            password: passwordHash,
            authProvider: "local",
            role: "user",
            activeStatus: "active",
            emailVerified: true,
            profile: { fullName: "Mini Revenue Listener 01", country: "Vietnam" },
        },
        {
            _id: ids.users[3],
            email: "mini.revenue.listener02@reso.seed",
            password: passwordHash,
            authProvider: "local",
            role: "user",
            activeStatus: "active",
            emailVerified: true,
            profile: { fullName: "Mini Revenue Listener 02", country: "Vietnam" },
        },
    ];
    const artist = {
        _id: ids.artist,
        userId: ids.users[1],
        name: "Mini Revenue Artist",
        bio: "Isolated artist for testing a small, internally consistent revenue flow.",
        stats: { followers: 0, totalStreams: 10, monthlyListeners: 2 },
        revenue: {
            totalWithdrawnAmount: 0,
            availableAmount: confirmedArtistPool,
            confirmedRevenueSummaryIds: [ids.revenueSummary],
        },
        activeStatus: "active",
    };
    const tracks = [
        {
            _id: ids.tracks[0],
            title: "Mini Revenue Track A",
            artist_artistId: ids.artist,
            audioFiles: [
                {
                    url: "https://example.com/mini-revenue-track-a.mp3",
                    format: "mp3",
                    bitrate: 320,
                    label: "high",
                    priority: 1,
                },
            ],
            duration: 200,
            stats: { totalLike: 0, totalPlay: 5 },
            releaseDate: confirmedMonth.subtract(1, "month").toDate(),
            releaseStatus: "released",
            releasedAt: confirmedMonth.subtract(1, "month").toDate(),
            activeStatus: "active",
            approvalStatus: "approved",
        },
        {
            _id: ids.tracks[1],
            title: "Mini Revenue Track B",
            artist_artistId: ids.artist,
            audioFiles: [
                {
                    url: "https://example.com/mini-revenue-track-b.mp3",
                    format: "mp3",
                    bitrate: 320,
                    label: "high",
                    priority: 1,
                },
            ],
            duration: 240,
            stats: { totalLike: 0, totalPlay: 5 },
            releaseDate: confirmedMonth.subtract(1, "month").toDate(),
            releaseStatus: "released",
            releasedAt: confirmedMonth.subtract(1, "month").toDate(),
            activeStatus: "active",
            approvalStatus: "approved",
        },
    ];
    const subscriptions = [
        {
            _id: ids.subscriptions[0],
            userId: ids.users[2],
            planId: ids.plan,
            planSnapshot,
            status: "expired",
            startDate: confirmedMonth.toDate(),
            endDate: confirmedMonth.add(1, "month").toDate(),
            autoRenew: false,
        },
        {
            _id: ids.subscriptions[1],
            userId: ids.users[3],
            planId: ids.plan,
            planSnapshot,
            status: "expired",
            startDate: openMonth.toDate(),
            endDate: openMonth.add(1, "month").toDate(),
            autoRenew: false,
        },
    ];
    const transactions = [
        {
            _id: ids.transactions[0],
            userId: ids.users[2],
            subscriptionId: ids.subscriptions[0],
            planId: ids.plan,
            planSnapshot,
            amount: planPrice,
            tax: 0,
            totalAmount: planPrice,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            gatewayTransactionId: "MINI-REVENUE-CONFIRMED",
            status: "success",
            paidAt: confirmedMonth.add(1, "day").hour(9).toDate(),
            invoiceNumber: "MINI-REVENUE-INVOICE-01",
            confirmationEmailStatus: "sent",
        },
        {
            _id: ids.transactions[1],
            userId: ids.users[3],
            subscriptionId: ids.subscriptions[1],
            planId: ids.plan,
            planSnapshot,
            amount: planPrice,
            tax: 0,
            totalAmount: planPrice,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            gatewayTransactionId: "MINI-REVENUE-OPEN",
            status: "success",
            paidAt: openMonth.add(1, "day").hour(9).toDate(),
            invoiceNumber: "MINI-REVENUE-INVOICE-02",
            confirmationEmailStatus: "sent",
        },
    ];

    let listenEventIndex = 0;
    const validEvent = (month, day, userId, trackIndex, percent = 60) =>
        buildListenEvent({
            id: ids.listenEvents[listenEventIndex++],
            userId,
            track: tracks[trackIndex],
            listenedAt: month.add(day - 1, "day").hour(12).toDate(),
            listenPercent: percent,
            valid: true,
        });
    const skippedEvent = (month, day, userId, trackIndex) =>
        buildListenEvent({
            id: ids.listenEvents[listenEventIndex++],
            userId,
            track: tracks[trackIndex],
            listenedAt: month.add(day - 1, "day").hour(12).toDate(),
            listenPercent: 10,
            valid: false,
        });

    const listenEvents = [
        validEvent(confirmedMonth, 2, ids.users[2], 0),
        validEvent(confirmedMonth, 3, ids.users[3], 0),
        validEvent(confirmedMonth, 4, ids.users[2], 0),
        validEvent(confirmedMonth, 5, ids.users[2], 1),
        validEvent(confirmedMonth, 6, ids.users[3], 1),
        skippedEvent(confirmedMonth, 7, ids.users[2], 0),
        validEvent(openMonth, 2, ids.users[2], 0),
        validEvent(openMonth, 3, ids.users[3], 0),
        validEvent(openMonth, 4, ids.users[2], 1),
        validEvent(openMonth, 5, ids.users[3], 1),
        validEvent(openMonth, 6, ids.users[2], 1),
        skippedEvent(openMonth, 7, ids.users[3], 1),
    ];

    users.slice(2).forEach((user) => {
        const userEvents = listenEvents.filter(
            (event) => String(event.userId) === String(user._id)
        );
        user.stats = {
            totalListeningTime: roundCurrency(
                userEvents.reduce(
                    (total, event) => total + Number(event.listenedDuration || 0),
                    0
                )
            ),
            totalTracksPlayed: userEvents.filter(
                (event) => event.isValidStream === true
            ).length,
        };
    });

    const confirmedStats = aggregateTrackStats({
        events: listenEvents,
        month: confirmedMonth,
        tracks,
    });
    const openStats = aggregateTrackStats({
        events: listenEvents,
        month: openMonth,
        tracks,
    });
    const confirmedEligibleStreams = confirmedStats.reduce(
        (total, stat) => total + stat.playCount,
        0
    );
    const openEligibleStreams = openStats.reduce(
        (total, stat) => total + stat.playCount,
        0
    );
    const firstTrackRevenue = roundCurrency(
        confirmedArtistPool *
            (confirmedStats[0].playCount / confirmedEligibleStreams)
    );
    const confirmedTrackRevenue = [
        firstTrackRevenue,
        confirmedArtistPool - firstTrackRevenue,
    ];
    const trackMonthlyStats = [
        ...confirmedStats.map((stat, index) => ({
            _id: ids.trackMonthlyStats[index],
            trackId: stat.trackId,
            year: confirmedMonth.year(),
            month: confirmedMonth.month() + 1,
            playCount: stat.playCount,
            uniqueListeners: stat.uniqueListeners,
            revenue: {
                eligibleStreams: stat.playCount,
                revenueAmount: confirmedTrackRevenue[index],
                artistRevenueAmount: confirmedTrackRevenue[index],
                calculatedAt,
            },
        })),
        ...openStats.map((stat, index) => ({
            _id: ids.trackMonthlyStats[index + 2],
            trackId: stat.trackId,
            year: openMonth.year(),
            month: openMonth.month() + 1,
            playCount: stat.playCount,
            uniqueListeners: stat.uniqueListeners,
            revenue: {
                eligibleStreams: 0,
                revenueAmount: 0,
                artistRevenueAmount: 0,
                calculatedAt: null,
            },
        })),
    ];
    const revenuePeriods = [
        {
            _id: ids.revenuePeriods[0],
            year: confirmedMonth.year(),
            month: confirmedMonth.month() + 1,
            ...confirmedRange,
            status: "confirmed",
            totalPremiumRevenue: planPrice,
            totalArtistPool: confirmedArtistPool,
            totalPlatformRevenue: planPrice - confirmedArtistPool,
            totalEligibleStreams: confirmedEligibleStreams,
            successfulTransactions: 1,
            dailyStats: [
                {
                    day: 2,
                    date: confirmedMonth.add(1, "day").toDate(),
                    premiumRevenue: planPrice,
                    artistPool: confirmedArtistPool,
                    platformRevenue: planPrice - confirmedArtistPool,
                    successfulTransactions: 1,
                },
            ],
            lastAggregatedAt: calculatedAt,
            closedAt: calculatedAt,
            calculatedAt,
            confirmedAt,
            confirmedBy: ids.users[0],
        },
        {
            _id: ids.revenuePeriods[1],
            year: openMonth.year(),
            month: openMonth.month() + 1,
            ...openRange,
            status: "open",
            totalPremiumRevenue: planPrice,
            totalArtistPool: openArtistPool,
            totalPlatformRevenue: planPrice - openArtistPool,
            totalEligibleStreams: openEligibleStreams,
            successfulTransactions: 1,
            dailyStats: [
                {
                    day: 2,
                    date: openMonth.add(1, "day").toDate(),
                    premiumRevenue: planPrice,
                    artistPool: openArtistPool,
                    platformRevenue: planPrice - openArtistPool,
                    successfulTransactions: 1,
                },
            ],
            lastAggregatedAt: openAggregatedAt,
            closedAt: null,
            calculatedAt: openAggregatedAt,
            confirmedAt: null,
            confirmedBy: null,
        },
    ];
    const revenueSummaries = [
        {
            _id: ids.revenueSummary,
            artistId: ids.artist,
            year: confirmedMonth.year(),
            month: confirmedMonth.month() + 1,
            totalEligibleStreams: confirmedEligibleStreams,
            grossRevenueAmount: planPrice,
            artistRevenueAmount: confirmedArtistPool,
            platformRevenueAmount: planPrice - confirmedArtistPool,
            withdrawnAmount: 0,
            availableAmount: confirmedArtistPool,
            status: "confirmed",
            calculatedAt,
            confirmedAt,
            confirmedBy: ids.users[0],
        },
    ];

    return {
        artistSharePercent,
        confirmedMonth,
        openMonth,
        plan: [plan],
        users,
        artists: [artist],
        tracks,
        subscriptions,
        transactions,
        listenEvents,
        trackMonthlyStats,
        revenuePeriods,
        revenueSummaries,
    };
};

const documentGroups = (data) => [
    ["plans", Plan, data.plan],
    ["users", User, data.users],
    ["artists", Artist, data.artists],
    ["tracks", Track, data.tracks],
    ["subscriptions", Subscription, data.subscriptions],
    ["transactions", Transaction, data.transactions],
    ["listen events", ListenEvent, data.listenEvents],
    ["track monthly stats", TrackMonthlyStat, data.trackMonthlyStats],
    ["artist revenue summaries", ArtistRevenueSummary, data.revenueSummaries],
    ["revenue periods", RevenuePeriod, data.revenuePeriods],
];

const validateDocuments = (data) => {
    for (const [label, Model, documents] of documentGroups(data)) {
        for (const document of documents) {
            const error = new Model(document).validateSync();
            if (error) {
                throw new Error(`Validation failed for ${label}: ${error.message}`);
            }
        }
    }
};

const assertEqual = (actual, expected, label) => {
    if (actual !== expected) {
        throw new Error(`${label}: expected ${expected}, received ${actual}.`);
    }
};

const verifyInvariants = (data) => {
    for (const period of data.revenuePeriods) {
        const inPeriod = (date) =>
            new Date(date) >= period.periodStart && new Date(date) < period.periodEnd;
        const premiumRevenue = data.transactions
            .filter((item) => item.status === "success" && inPeriod(item.paidAt))
            .reduce((sum, item) => sum + item.amount, 0);
        const eligibleStreams = data.listenEvents.filter(
            (item) => item.isValidStream === true && inPeriod(item.listenedAt)
        ).length;
        const monthlyStats = data.trackMonthlyStats.filter(
            (item) => item.year === period.year && item.month === period.month
        );

        assertEqual(premiumRevenue, period.totalPremiumRevenue, "Premium revenue");
        assertEqual(eligibleStreams, period.totalEligibleStreams, "Eligible streams");
        assertEqual(
            monthlyStats.reduce((sum, item) => sum + item.playCount, 0),
            eligibleStreams,
            "Track play count"
        );
    }

    for (const track of data.tracks) {
        const validTrackEvents = data.listenEvents.filter(
            (item) =>
                item.isValidStream === true &&
                String(item.trackId) === String(track._id)
        ).length;
        assertEqual(track.stats.totalPlay, validTrackEvents, "Track lifetime play count");
    }

    for (const user of data.users.slice(2)) {
        const userEvents = data.listenEvents.filter(
            (item) => String(item.userId) === String(user._id)
        );
        assertEqual(
            user.stats.totalTracksPlayed,
            userEvents.filter((item) => item.isValidStream === true).length,
            "User valid play count"
        );
        assertEqual(
            user.stats.totalListeningTime,
            roundCurrency(
                userEvents.reduce(
                    (sum, item) => sum + Number(item.listenedDuration || 0),
                    0
                )
            ),
            "User listening time"
        );
    }

    const confirmedPeriod = data.revenuePeriods[0];
    const confirmedStats = data.trackMonthlyStats.filter(
        (item) =>
            item.year === confirmedPeriod.year && item.month === confirmedPeriod.month
    );
    const summary = data.revenueSummaries[0];

    assertEqual(
        confirmedStats.reduce(
            (sum, item) => sum + item.revenue.artistRevenueAmount,
            0
        ),
        confirmedPeriod.totalArtistPool,
        "Track artist revenue"
    );
    assertEqual(
        summary.totalEligibleStreams,
        confirmedPeriod.totalEligibleStreams,
        "Artist eligible streams"
    );
    assertEqual(
        summary.artistRevenueAmount,
        confirmedPeriod.totalArtistPool,
        "Artist revenue amount"
    );
    assertEqual(
        data.artists[0].revenue.availableAmount,
        summary.availableAmount,
        "Artist available balance"
    );
};

const ensureNoCollisions = async (data) => {
    const revenuePeriodFilters = data.revenuePeriods.map((item) => ({
        year: item.year,
        month: item.month,
    }));
    const listenEventPeriodFilters = data.revenuePeriods.map((item) => ({
        listenedAt: { $gte: item.periodStart, $lt: item.periodEnd },
    }));
    const transactionPeriodFilters = data.revenuePeriods.map((item) => ({
        paidAt: { $gte: item.periodStart, $lt: item.periodEnd },
    }));
    const checks = [
        [
            "plan id or name",
            Plan.exists({
                $or: [
                    { _id: { $in: data.plan.map((item) => item._id) } },
                    { name: { $in: data.plan.map((item) => item.name) } },
                ],
            }),
        ],
        [
            "user id or email",
            User.exists({
                $or: [
                    { _id: { $in: data.users.map((item) => item._id) } },
                    { email: { $in: data.users.map((item) => item.email) } },
                ],
            }),
        ],
        ["artist", Artist.exists({ _id: { $in: data.artists.map((item) => item._id) } })],
        ["track", Track.exists({ _id: { $in: data.tracks.map((item) => item._id) } })],
        [
            "subscription",
            Subscription.exists({
                _id: { $in: data.subscriptions.map((item) => item._id) },
            }),
        ],
        [
            "transaction id, gateway id, or invoice",
            Transaction.exists({
                $or: [
                    { _id: { $in: data.transactions.map((item) => item._id) } },
                    {
                        gatewayTransactionId: {
                            $in: data.transactions.map((item) => item.gatewayTransactionId),
                        },
                    },
                    {
                        invoiceNumber: {
                            $in: data.transactions.map((item) => item.invoiceNumber),
                        },
                    },
                ],
            }),
        ],
        [
            "listen events in either selected month",
            ListenEvent.exists({ $or: listenEventPeriodFilters }),
        ],
        [
            "successful transactions in either selected month",
            Transaction.exists({
                status: "success",
                $or: transactionPeriodFilters,
            }),
        ],
        [
            "track monthly stats in either selected month",
            TrackMonthlyStat.exists({ $or: revenuePeriodFilters }),
        ],
        [
            "artist revenue summaries in either selected month",
            ArtistRevenueSummary.exists({ $or: revenuePeriodFilters }),
        ],
        [
            "revenue period",
            RevenuePeriod.exists({ $or: revenuePeriodFilters }),
        ],
    ];

    const results = await Promise.all(
        checks.map(async ([label, promise]) => [label, Boolean(await promise)])
    );
    const collisions = results.filter(([, exists]) => exists).map(([label]) => label);

    if (collisions.length > 0) {
        throw new Error(
            `Mini revenue seed aborted before writing. Existing data conflicts with: ${collisions.join(
                ", "
            )}. The two selected months must be globally empty so revenue testing cannot modify existing monthly data. Choose another MINI_REVENUE_OPEN_MONTH or use a clean database.`
        );
    }
};

const insertSeedData = async (data) => {
    for (const [label, Model, documents] of documentGroups(data)) {
        await Model.insertMany(documents, { ordered: true });
        console.log(`Inserted ${documents.length} ${label}.`);
    }
};

const printSummary = (data, mode) => {
    const confirmed = data.revenuePeriods[0];
    const open = data.revenuePeriods[1];
    const totalDocuments = documentGroups(data).reduce(
        (sum, [, , documents]) => sum + documents.length,
        0
    );

    console.log("\nMini revenue seed");
    console.log(`Mode: ${mode}`);
    console.log(`Timezone: ${TIMEZONE}`);
    console.log(`Artist revenue share: ${data.artistSharePercent}%`);
    console.log(`Documents: ${totalDocuments}`);
    console.log(
        `Confirmed period: ${data.confirmedMonth.format("YYYY-MM")} | ` +
            `${confirmed.totalEligibleStreams} streams | ${confirmed.totalArtistPool} VND artist pool`
    );
    console.log(
        `Past open period: ${data.openMonth.format("YYYY-MM")} | ` +
            `${open.totalEligibleStreams} streams | ${open.totalArtistPool} VND artist pool`
    );
    console.log(`Artist login: mini.revenue.artist@reso.seed / ${SEED_PASSWORD}`);
    console.log(`Admin login: mini.revenue.admin@reso.seed / ${SEED_PASSWORD}`);
};

const main = async () => {
    const data = await buildSeedData();
    validateDocuments(data);
    verifyInvariants(data);

    if (!APPLY) {
        printSummary(data, "dry-run; database was not connected or changed");
        return;
    }

    if (!process.env.DATABASE) {
        throw new Error("DATABASE is missing. Configure it before using --apply.");
    }

    mongoose.set("autoIndex", false);
    await mongoose.connect(process.env.DATABASE);
    await ensureNoCollisions(data);
    await insertSeedData(data);
    printSummary(data, "insert-only database seed completed");
};

main()
    .catch((error) => {
        console.error("Mini revenue seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });
