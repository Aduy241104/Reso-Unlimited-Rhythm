import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import models from "./models/index.js";
import {
    ARTIST_REVENUE_SHARE_RATIO,
    buildRevenuePeriodRange,
    getRevenueDashboardTimezone,
} from "./helpers/revenuePeriod.helper.js";

dotenv.config();

dayjs.extend(utc);
dayjs.extend(timezone);

const {
    User,
    Artist,
    Plan,
    Track,
    Transaction,
    ListenEvent,
    RevenuePeriod,
    ArtistRevenueSummary,
    TrackMonthlyStat,
} = models;

const DEFAULT_TARGET_MONTH = "2001-01";
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const oid = (value) => new mongoose.Types.ObjectId(value);
const roundCurrency = (value) => Math.max(0, Math.round(Number(value) || 0));
const toId = (value) => value?.toString();

const ids = {
    adminUser: oid("683300000000000000000001"),
    listenerUserOne: oid("683300000000000000000002"),
    listenerUserTwo: oid("683300000000000000000003"),
    artistUserOne: oid("683300000000000000000004"),
    artistUserTwo: oid("683300000000000000000005"),

    artistOne: oid("683300000000000000000101"),
    artistTwo: oid("683300000000000000000102"),

    premiumPlan: oid("683300000000000000000201"),

    trackOne: oid("683300000000000000000301"),
    trackTwo: oid("683300000000000000000302"),
    trackThree: oid("683300000000000000000303"),

    transactionOne: oid("683300000000000000000401"),
    transactionTwo: oid("683300000000000000000402"),
    transactionThree: oid("683300000000000000000403"),
    transactionFailed: oid("683300000000000000000404"),
    transactionOutsidePeriod: oid("683300000000000000000405"),

    listenOne: oid("683300000000000000000501"),
    listenTwo: oid("683300000000000000000502"),
    listenThree: oid("683300000000000000000503"),
    listenFour: oid("683300000000000000000504"),
    listenFive: oid("683300000000000000000505"),
    listenSix: oid("683300000000000000000506"),
    listenInvalid: oid("683300000000000000000507"),
    listenOutsidePeriod: oid("683300000000000000000508"),

    trackMonthlyStatOne: oid("683300000000000000000601"),
    trackMonthlyStatTwo: oid("683300000000000000000602"),
    trackMonthlyStatThree: oid("683300000000000000000603"),
};

const trackSeedCatalog = [
    {
        _id: ids.trackOne,
        title: "Revenue Flow Track One",
        artistId: ids.artistOne,
        duration: 210,
        audioUrl: "https://example.com/audio/revenue-flow-track-one.mp3",
    },
    {
        _id: ids.trackTwo,
        title: "Revenue Flow Track Two",
        artistId: ids.artistOne,
        duration: 185,
        audioUrl: "https://example.com/audio/revenue-flow-track-two.mp3",
    },
    {
        _id: ids.trackThree,
        title: "Revenue Flow Track Three",
        artistId: ids.artistTwo,
        duration: 200,
        audioUrl: "https://example.com/audio/revenue-flow-track-three.mp3",
    },
];

const trackMonthlyStatIdByTrackId = new Map([
    [toId(ids.trackOne), ids.trackMonthlyStatOne],
    [toId(ids.trackTwo), ids.trackMonthlyStatTwo],
    [toId(ids.trackThree), ids.trackMonthlyStatThree],
]);

const seedCollections = [
    {
        model: ArtistRevenueSummary,
        filter: (context) => ({
            year: context.year,
            month: context.month,
            artistId: { $in: [ids.artistOne, ids.artistTwo] },
        }),
    },
    {
        model: RevenuePeriod,
        filter: (context) => ({
            year: context.year,
            month: context.month,
        }),
    },
    {
        model: TrackMonthlyStat,
        filter: (context) => ({
            year: context.year,
            month: context.month,
            trackId: { $in: trackSeedCatalog.map((track) => track._id) },
        }),
    },
    {
        model: ListenEvent,
        ids: [
            ids.listenOne,
            ids.listenTwo,
            ids.listenThree,
            ids.listenFour,
            ids.listenFive,
            ids.listenSix,
            ids.listenInvalid,
            ids.listenOutsidePeriod,
        ],
    },
    {
        model: Transaction,
        ids: [
            ids.transactionOne,
            ids.transactionTwo,
            ids.transactionThree,
            ids.transactionFailed,
            ids.transactionOutsidePeriod,
        ],
    },
    {
        model: Track,
        ids: trackSeedCatalog.map((track) => track._id),
    },
    {
        model: Artist,
        ids: [ids.artistOne, ids.artistTwo],
    },
    {
        model: Plan,
        ids: [ids.premiumPlan],
    },
    {
        model: User,
        ids: [
            ids.adminUser,
            ids.listenerUserOne,
            ids.listenerUserTwo,
            ids.artistUserOne,
            ids.artistUserTwo,
        ],
    },
];

const readTargetMonthArgument = () => {
    const rawArgument = process.argv[2];

    if (!rawArgument) {
        return DEFAULT_TARGET_MONTH;
    }

    if (!MONTH_PATTERN.test(rawArgument)) {
        throw new Error(
            `Invalid target month. Use YYYY-MM format, for example ${DEFAULT_TARGET_MONTH}.`
        );
    }

    return rawArgument;
};

const buildMonthContext = (targetMonth) => {
    const timezoneName = getRevenueDashboardTimezone();
    const monthDate = dayjs.tz(`${targetMonth}-01T00:00:00`, timezoneName);
    const year = monthDate.year();
    const month = monthDate.month() + 1;
    const { periodStart, periodEnd } = buildRevenuePeriodRange(
        year,
        month,
        timezoneName
    );

    return {
        timezoneName,
        year,
        month,
        targetMonth,
        periodStart,
        periodEnd,
    };
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

const cleanupSeedData = async (context) => {
    for (const entry of seedCollections) {
        if (typeof entry.filter === "function") {
            await entry.model.deleteMany(entry.filter(context));
            continue;
        }

        if (entry.ids?.length) {
            await entry.model.deleteMany({ _id: { $in: entry.ids } });
        }
    }
};

const buildPasswords = async () => ({
    admin: await bcrypt.hash("Admin@123", 10),
    artist: await bcrypt.hash("Artist@123", 10),
    listener: await bcrypt.hash("Listener@123", 10),
});

const isWithinPeriod = (value, context) => {
    const timestamp = new Date(value).getTime();
    return (
        timestamp >= new Date(context.periodStart).getTime() &&
        timestamp < new Date(context.periodEnd).getTime()
    );
};

const groupCounts = (items, keySelector) => {
    const counts = new Map();

    for (const item of items) {
        const key = keySelector(item);
        counts.set(key, Number(counts.get(key) || 0) + 1);
    }

    return counts;
};

const groupUniqueCounts = (items, keySelector, uniqueValueSelector) => {
    const groups = new Map();

    for (const item of items) {
        const key = keySelector(item);

        if (!groups.has(key)) {
            groups.set(key, new Set());
        }

        groups.get(key).add(uniqueValueSelector(item));
    }

    return new Map(
        [...groups.entries()].map(([key, values]) => [key, values.size])
    );
};

const groupRevenueByDate = (transactions, timezoneName) => {
    const grouped = new Map();

    for (const transaction of transactions) {
        const dateKey = dayjs(transaction.paidAt)
            .tz(timezoneName)
            .format("YYYY-MM-DD");
        const current = grouped.get(dateKey) || {
            dateKey,
            premiumRevenue: 0,
            successfulTransactions: 0,
        };

        current.premiumRevenue += Number(transaction.amount || 0);
        current.successfulTransactions += 1;
        grouped.set(dateKey, current);
    }

    return [...grouped.values()]
        .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
        .map((item) => {
            const premiumRevenue = roundCurrency(item.premiumRevenue);
            const artistPool = roundCurrency(
                premiumRevenue * ARTIST_REVENUE_SHARE_RATIO
            );
            const platformRevenue = premiumRevenue - artistPool;
            const date = dayjs
                .tz(`${item.dateKey}T00:00:00`, timezoneName)
                .toDate();

            return {
                day: dayjs(date).tz(timezoneName).date(),
                date,
                premiumRevenue,
                artistPool,
                platformRevenue,
                successfulTransactions: item.successfulTransactions,
            };
        });
};

const buildListenEvent = ({
    _id,
    userId,
    trackId,
    artistId,
    trackDuration,
    listenedAt,
    isValidStream,
    listenedDuration,
}) => {
    const resolvedDuration = isValidStream
        ? listenedDuration || Math.max(trackDuration - 20, 1)
        : Math.max(Math.min(listenedDuration || 12, 30), 5);
    const listenPercent = Math.min(
        100,
        Math.round((resolvedDuration / trackDuration) * 100)
    );

    return {
        _id,
        userId,
        trackId,
        artistId,
        listenedAt,
        trackDuration,
        listenedDuration: resolvedDuration,
        listenPercent,
        dailyListenOrder: 1,
        requiredPercent: 50,
        source: "track_detail",
        isValidStream,
        duration: resolvedDuration,
        completed: isValidStream,
        skipped: !isValidStream,
        device: "web",
        country: "VN",
    };
};

const buildFixture = (context) => {
    const trackCatalogById = new Map(
        trackSeedCatalog.map((track) => [toId(track._id), track])
    );
    const transactions = [
        {
            _id: ids.transactionOne,
            userId: ids.listenerUserOne,
            planId: ids.premiumPlan,
            amount: 120000,
            tax: 0,
            totalAmount: 120000,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            gatewayTransactionId: "FLOW-TXN-001",
            status: "success",
            paidAt: dayjs(context.periodStart).add(2, "day").hour(9).toDate(),
            invoiceNumber: "FLOW-INV-001",
        },
        {
            _id: ids.transactionTwo,
            userId: ids.listenerUserTwo,
            planId: ids.premiumPlan,
            amount: 180000,
            tax: 0,
            totalAmount: 180000,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            gatewayTransactionId: "FLOW-TXN-002",
            status: "success",
            paidAt: dayjs(context.periodStart).add(10, "day").hour(20).toDate(),
            invoiceNumber: "FLOW-INV-002",
        },
        {
            _id: ids.transactionThree,
            userId: ids.listenerUserOne,
            planId: ids.premiumPlan,
            amount: 200000,
            tax: 0,
            totalAmount: 200000,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            gatewayTransactionId: "FLOW-TXN-003",
            status: "success",
            paidAt: dayjs(context.periodStart).add(18, "day").hour(14).toDate(),
            invoiceNumber: "FLOW-INV-003",
        },
        {
            _id: ids.transactionFailed,
            userId: ids.listenerUserOne,
            planId: ids.premiumPlan,
            amount: 90000,
            tax: 0,
            totalAmount: 90000,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            gatewayTransactionId: "FLOW-TXN-004",
            status: "failed",
            failedAt: dayjs(context.periodStart).add(21, "day").hour(16).toDate(),
            failureReason: "Seed failed transaction should be ignored.",
            invoiceNumber: "FLOW-INV-004",
        },
        {
            _id: ids.transactionOutsidePeriod,
            userId: ids.listenerUserTwo,
            planId: ids.premiumPlan,
            amount: 250000,
            tax: 0,
            totalAmount: 250000,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            gatewayTransactionId: "FLOW-TXN-005",
            status: "success",
            paidAt: dayjs(context.periodStart).subtract(3, "day").hour(11).toDate(),
            invoiceNumber: "FLOW-INV-005",
        },
    ];

    const listenEvents = [
        buildListenEvent({
            _id: ids.listenOne,
            userId: ids.listenerUserOne,
            trackId: ids.trackOne,
            artistId: ids.artistOne,
            trackDuration: trackCatalogById.get(toId(ids.trackOne)).duration,
            listenedAt: dayjs(context.periodStart).add(3, "day").hour(8).toDate(),
            isValidStream: true,
            listenedDuration: 190,
        }),
        buildListenEvent({
            _id: ids.listenTwo,
            userId: ids.listenerUserOne,
            trackId: ids.trackTwo,
            artistId: ids.artistOne,
            trackDuration: trackCatalogById.get(toId(ids.trackTwo)).duration,
            listenedAt: dayjs(context.periodStart).add(4, "day").hour(9).toDate(),
            isValidStream: true,
            listenedDuration: 170,
        }),
        buildListenEvent({
            _id: ids.listenThree,
            userId: ids.listenerUserTwo,
            trackId: ids.trackOne,
            artistId: ids.artistOne,
            trackDuration: trackCatalogById.get(toId(ids.trackOne)).duration,
            listenedAt: dayjs(context.periodStart).add(6, "day").hour(10).toDate(),
            isValidStream: true,
            listenedDuration: 195,
        }),
        buildListenEvent({
            _id: ids.listenFour,
            userId: ids.listenerUserTwo,
            trackId: ids.trackThree,
            artistId: ids.artistTwo,
            trackDuration: trackCatalogById.get(toId(ids.trackThree)).duration,
            listenedAt: dayjs(context.periodStart).add(8, "day").hour(11).toDate(),
            isValidStream: true,
            listenedDuration: 182,
        }),
        buildListenEvent({
            _id: ids.listenFive,
            userId: ids.listenerUserOne,
            trackId: ids.trackOne,
            artistId: ids.artistOne,
            trackDuration: trackCatalogById.get(toId(ids.trackOne)).duration,
            listenedAt: dayjs(context.periodStart).add(12, "day").hour(12).toDate(),
            isValidStream: true,
            listenedDuration: 200,
        }),
        buildListenEvent({
            _id: ids.listenSix,
            userId: ids.listenerUserOne,
            trackId: ids.trackThree,
            artistId: ids.artistTwo,
            trackDuration: trackCatalogById.get(toId(ids.trackThree)).duration,
            listenedAt: dayjs(context.periodStart).add(17, "day").hour(13).toDate(),
            isValidStream: true,
            listenedDuration: 180,
        }),
        buildListenEvent({
            _id: ids.listenInvalid,
            userId: ids.listenerUserTwo,
            trackId: ids.trackTwo,
            artistId: ids.artistOne,
            trackDuration: trackCatalogById.get(toId(ids.trackTwo)).duration,
            listenedAt: dayjs(context.periodStart).add(20, "day").hour(9).toDate(),
            isValidStream: false,
            listenedDuration: 18,
        }),
        buildListenEvent({
            _id: ids.listenOutsidePeriod,
            userId: ids.listenerUserTwo,
            trackId: ids.trackThree,
            artistId: ids.artistTwo,
            trackDuration: trackCatalogById.get(toId(ids.trackThree)).duration,
            listenedAt: dayjs(context.periodStart).subtract(2, "day").hour(15).toDate(),
            isValidStream: true,
            listenedDuration: 176,
        }),
    ];

    const successfulTransactionsInPeriod = transactions.filter(
        (transaction) =>
            transaction.status === "success" &&
            isWithinPeriod(transaction.paidAt, context)
    );
    const eligibleListenEventsInPeriod = listenEvents.filter(
        (listenEvent) =>
            listenEvent.isValidStream === true &&
            isWithinPeriod(listenEvent.listenedAt, context)
    );
    const validListenEventsAllTime = listenEvents.filter(
        (listenEvent) => listenEvent.isValidStream === true
    );
    const totalPremiumRevenue = roundCurrency(
        successfulTransactionsInPeriod.reduce(
            (sum, transaction) => sum + Number(transaction.amount || 0),
            0
        )
    );
    const totalArtistPool = roundCurrency(
        totalPremiumRevenue * ARTIST_REVENUE_SHARE_RATIO
    );
    const totalPlatformRevenue = totalPremiumRevenue - totalArtistPool;
    const totalEligibleStreams = eligibleListenEventsInPeriod.length;
    const streamCountByTrack = groupCounts(
        eligibleListenEventsInPeriod,
        (item) => toId(item.trackId)
    );
    const uniqueListenerCountByTrack = groupUniqueCounts(
        eligibleListenEventsInPeriod,
        (item) => toId(item.trackId),
        (item) => toId(item.userId)
    );
    const streamCountByArtist = groupCounts(
        eligibleListenEventsInPeriod,
        (item) => toId(item.artistId)
    );
    const allTimeTrackPlays = groupCounts(
        validListenEventsAllTime,
        (item) => toId(item.trackId)
    );
    const allTimeArtistStreams = groupCounts(
        validListenEventsAllTime,
        (item) => toId(item.artistId)
    );

    if (totalEligibleStreams <= 0) {
        throw new Error("Revenue flow seed requires at least one eligible stream.");
    }

    const expectedArtistRevenues = [...streamCountByArtist.entries()].map(
        ([artistId, eligibleStreams]) => ({
            artistId,
            eligibleStreams,
            artistRevenueAmount: roundCurrency(
                totalArtistPool * (eligibleStreams / totalEligibleStreams)
            ),
        })
    );
    const expectedTrackRevenues = [...streamCountByTrack.entries()].map(
        ([trackId, eligibleStreams]) => {
            const trackSeed = trackCatalogById.get(trackId);

            return {
                trackId,
                title: trackSeed.title,
                artistId: toId(trackSeed.artistId),
                eligibleStreams,
                uniqueListeners: Number(uniqueListenerCountByTrack.get(trackId) || 0),
                artistRevenueAmount: roundCurrency(
                    totalArtistPool * (eligibleStreams / totalEligibleStreams)
                ),
            };
        }
    );

    const distributedArtistAmount = roundCurrency(
        expectedArtistRevenues.reduce(
            (sum, item) => sum + Number(item.artistRevenueAmount || 0),
            0
        )
    );
    const distributedTrackAmount = roundCurrency(
        expectedTrackRevenues.reduce(
            (sum, item) => sum + Number(item.artistRevenueAmount || 0),
            0
        )
    );

    if (distributedArtistAmount !== totalArtistPool) {
        throw new Error(
            `Artist revenue mismatch inside seed fixture. Expected ${totalArtistPool} but got ${distributedArtistAmount}.`
        );
    }

    if (distributedTrackAmount !== totalArtistPool) {
        throw new Error(
            `Track revenue mismatch inside seed fixture. Expected ${totalArtistPool} but got ${distributedTrackAmount}.`
        );
    }

    const trackMonthlyStats = expectedTrackRevenues.map((item) => ({
        _id: trackMonthlyStatIdByTrackId.get(item.trackId),
        trackId: oid(item.trackId),
        year: context.year,
        month: context.month,
        playCount: item.eligibleStreams,
        uniqueListeners: item.uniqueListeners,
        revenue: {
            eligibleStreams: 0,
            revenueAmount: 0,
            artistRevenueAmount: 0,
            calculatedAt: null,
        },
    }));

    const dailyRevenueStats = groupRevenueByDate(
        successfulTransactionsInPeriod,
        context.timezoneName
    );

    return {
        transactions,
        listenEvents,
        expected: {
            successfulTransactionsInPeriod,
            eligibleListenEventsInPeriod,
            totalPremiumRevenue,
            totalArtistPool,
            totalPlatformRevenue,
            totalEligibleStreams,
            expectedArtistRevenues,
            expectedTrackRevenues,
            trackMonthlyStats,
            dailyRevenueStats,
            allTimeTrackPlays,
            allTimeArtistStreams,
        },
    };
};

const seedUsers = async (passwords) => {
    await User.insertMany([
        {
            _id: ids.adminUser,
            email: "admin.revenue.flow@reso.local",
            password: passwords.admin,
            role: "admin",
            activeStatus: "active",
            emailVerified: true,
            profile: {
                fullName: "Revenue Flow Admin",
                gender: "other",
                country: "Vietnam",
            },
        },
        {
            _id: ids.listenerUserOne,
            email: "listener.one.revenue.flow@reso.local",
            password: passwords.listener,
            role: "user",
            activeStatus: "active",
            emailVerified: true,
            subscription: {
                isPremium: true,
                currentPlanId: ids.premiumPlan,
                premiumEndDate: dayjs().add(30, "day").toDate(),
            },
            profile: {
                fullName: "Revenue Flow Listener One",
                gender: "female",
                country: "Vietnam",
            },
        },
        {
            _id: ids.listenerUserTwo,
            email: "listener.two.revenue.flow@reso.local",
            password: passwords.listener,
            role: "user",
            activeStatus: "active",
            emailVerified: true,
            subscription: {
                isPremium: true,
                currentPlanId: ids.premiumPlan,
                premiumEndDate: dayjs().add(45, "day").toDate(),
            },
            profile: {
                fullName: "Revenue Flow Listener Two",
                gender: "male",
                country: "Vietnam",
            },
        },
        {
            _id: ids.artistUserOne,
            email: "artist.one.flow@reso.local",
            password: passwords.artist,
            role: "artist",
            activeStatus: "active",
            emailVerified: true,
            profile: {
                fullName: "Flow Artist One",
                gender: "female",
                country: "Vietnam",
            },
        },
        {
            _id: ids.artistUserTwo,
            email: "artist.two.flow@reso.local",
            password: passwords.artist,
            role: "artist",
            activeStatus: "active",
            emailVerified: true,
            profile: {
                fullName: "Flow Artist Two",
                gender: "male",
                country: "Vietnam",
            },
        },
    ]);
};

const seedPlan = async () => {
    await Plan.create({
        _id: ids.premiumPlan,
        name: "Revenue Flow Premium Plan",
        price: 99000,
        durationDays: 30,
        description: "Seed plan for testing revenue flow.",
        features: ["NO_ADS", "HIGH_QUALITY_AUDIO", "BACKGROUND_PLAY"],
        status: "active",
    });
};

const seedArtists = async (expected) => {
    const allTimeArtistStreams = expected.allTimeArtistStreams;

    await Artist.insertMany([
        {
            _id: ids.artistOne,
            userId: ids.artistUserOne,
            name: "Flow Artist One",
            bio: "Artist seed de test chia doanh thu cho flow tinh va xac nhan.",
            avatar: "https://example.com/seed/flow-artist-one.jpg",
            coverImage: "https://example.com/seed/flow-artist-one-cover.jpg",
            verificationStatus: "verified",
            activeStatus: "active",
            stats: {
                followers: 12,
                totalStreams: Number(allTimeArtistStreams.get(toId(ids.artistOne)) || 0),
                monthlyListeners: 2,
            },
            revenue: {
                totalEarnedAmount: 0,
                totalWithdrawnAmount: 0,
                availableAmount: 0,
                pendingPayoutAmount: 0,
                confirmedRevenueSummaryIds: [],
            },
        },
        {
            _id: ids.artistTwo,
            userId: ids.artistUserTwo,
            name: "Flow Artist Two",
            bio: "Artist seed de test chia doanh thu voi it du lieu nhung khop so.",
            avatar: "https://example.com/seed/flow-artist-two.jpg",
            coverImage: "https://example.com/seed/flow-artist-two-cover.jpg",
            verificationStatus: "verified",
            activeStatus: "active",
            stats: {
                followers: 7,
                totalStreams: Number(allTimeArtistStreams.get(toId(ids.artistTwo)) || 0),
                monthlyListeners: 2,
            },
            revenue: {
                totalEarnedAmount: 0,
                totalWithdrawnAmount: 0,
                availableAmount: 0,
                pendingPayoutAmount: 0,
                confirmedRevenueSummaryIds: [],
            },
        },
    ]);
};

const seedTracks = async (context, expected) => {
    const allTimeTrackPlays = expected.allTimeTrackPlays;

    await Track.insertMany(
        trackSeedCatalog.map((track) => ({
            _id: track._id,
            title: track.title,
            artist_artistId: track.artistId,
            audioFiles: [
                {
                    url: track.audioUrl,
                    format: "mp3",
                    bitrate: 320,
                    label: "original",
                    priority: 0,
                },
            ],
            duration: track.duration,
            releaseDate: context.periodStart,
            activeStatus: "active",
            approvalStatus: "approved",
            stats: {
                totalLike: 0,
                totalPlay: Number(allTimeTrackPlays.get(toId(track._id)) || 0),
            },
            copyright: {
                declarationAccepted: true,
                copyrightStatus: "verified",
            },
        }))
    );

    await TrackMonthlyStat.insertMany(expected.trackMonthlyStats);
};

const seedTransactions = async (transactions) => {
    await Transaction.insertMany(transactions);
};

const seedListenEvents = async (listenEvents) => {
    await ListenEvent.insertMany(listenEvents);
};

const formatCurrency = (value) => Number(value || 0).toLocaleString("vi-VN");

const logExpectedSummary = (context, expected) => {
    console.log("Revenue flow seed completed successfully.");
    console.log(`Timezone: ${context.timezoneName}`);
    console.log(`Target month for testing: ${context.targetMonth}`);
    console.log("");
    console.log("Seed accounts:");
    console.log("  admin.revenue.flow@reso.local / Admin@123");
    console.log("  listener.one.revenue.flow@reso.local / Listener@123");
    console.log("  listener.two.revenue.flow@reso.local / Listener@123");
    console.log("  artist.one.flow@reso.local / Artist@123");
    console.log("  artist.two.flow@reso.local / Artist@123");
    console.log("");
    console.log("Expected source data inside target month:");
    console.log(
        `  Successful transactions: ${expected.successfulTransactionsInPeriod.length}`
    );
    console.log(
        `  Eligible streams: ${expected.eligibleListenEventsInPeriod.length}`
    );
    console.log(
        `  Premium revenue: ${formatCurrency(expected.totalPremiumRevenue)}`
    );
    console.log(
        `  Artist pool (${Math.round(ARTIST_REVENUE_SHARE_RATIO * 100)}%): ${formatCurrency(expected.totalArtistPool)}`
    );
    console.log(
        `  Platform revenue: ${formatCurrency(expected.totalPlatformRevenue)}`
    );
    console.log("");
    console.log("Expected artist distribution after calculate:");
    for (const artistRevenue of expected.expectedArtistRevenues) {
        const artistName =
            artistRevenue.artistId === toId(ids.artistOne)
                ? "Flow Artist One"
                : "Flow Artist Two";
        console.log(
            `  ${artistName}: ${artistRevenue.eligibleStreams} streams -> ${formatCurrency(artistRevenue.artistRevenueAmount)}`
        );
    }
    console.log("");
    console.log("Expected track distribution after calculate:");
    for (const trackRevenue of expected.expectedTrackRevenues) {
        console.log(
            `  ${trackRevenue.title}: ${trackRevenue.eligibleStreams} streams, ${trackRevenue.uniqueListeners} listeners -> ${formatCurrency(trackRevenue.artistRevenueAmount)}`
        );
    }
    console.log("");
    console.log("Expected daily revenue stats after revenue sync:");
    for (const dailyStat of expected.dailyRevenueStats) {
        const dateLabel = dayjs(dailyStat.date)
            .tz(context.timezoneName)
            .format("YYYY-MM-DD");
        console.log(
            `  ${dateLabel}: revenue ${formatCurrency(dailyStat.premiumRevenue)}, artist pool ${formatCurrency(dailyStat.artistPool)}, platform ${formatCurrency(dailyStat.platformRevenue)}, tx ${dailyStat.successfulTransactions}`
        );
    }
    console.log("");
    console.log("Suggested test flow:");
    console.log("  1. npm run seed:revenue-flow");
    console.log(`  2. npm run revenue:sync -- ${context.targetMonth}`);
    console.log(`  3. GET /api/admin/revenue/periods?year=${context.year}&month=${context.month}`);
    console.log("  4. POST /api/admin/revenue/periods/:id/close");
    console.log("  5. POST /api/admin/revenue/periods/:id/calculate");
    console.log("  6. POST /api/admin/revenue/periods/:id/confirm");
    console.log("  7. GET /api/artist/revenue/dashboard khi dang nhap artist de doi chieu so");
};

const main = async () => {
    const targetMonth = readTargetMonthArgument();
    const context = buildMonthContext(targetMonth);
    const fixture = buildFixture(context);

    await connectDatabase();
    await ensureIndexes();
    await cleanupSeedData(context);

    const passwords = await buildPasswords();

    await seedUsers(passwords);
    await seedPlan();
    await seedArtists(fixture.expected);
    await seedTracks(context, fixture.expected);
    await seedTransactions(fixture.transactions);
    await seedListenEvents(fixture.listenEvents);

    logExpectedSummary(context, fixture.expected);
};

main()
    .catch((error) => {
        console.error("Revenue flow seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
