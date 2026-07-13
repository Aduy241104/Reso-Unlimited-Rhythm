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
    ArtistVerificationRequest,
    Plan,
    Track,
    Transaction,
    ListenEvent,
    RevenuePeriod,
    ArtistRevenueSummary,
    TrackMonthlyStat,
} = models;

const oid = (value) => new mongoose.Types.ObjectId(value);
const roundCurrency = (value) => Math.max(0, Math.round(Number(value) || 0));
const ids = {
    adminUser: oid("683300000000000000000001"),
    listenerUser: oid("683300000000000000000002"),
    artistUserOne: oid("683300000000000000000003"),
    artistUserTwo: oid("683300000000000000000004"),

    artistOne: oid("683300000000000000000101"),
    artistTwo: oid("683300000000000000000102"),
    artistVerificationRequestOne: oid("683300000000000000000103"),
    artistVerificationRequestTwo: oid("683300000000000000000104"),

    premiumPlan: oid("683300000000000000000201"),

    trackOne: oid("683300000000000000000301"),
    trackTwo: oid("683300000000000000000302"),
    trackThree: oid("683300000000000000000303"),

    transactionOne: oid("683300000000000000000401"),
    transactionTwo: oid("683300000000000000000402"),
    transactionFailed: oid("683300000000000000000403"),
    transactionOutsidePeriod: oid("683300000000000000000404"),

    listenOne: oid("683300000000000000000501"),
    listenTwo: oid("683300000000000000000502"),
    listenThree: oid("683300000000000000000503"),
    listenFour: oid("683300000000000000000504"),
    listenFive: oid("683300000000000000000505"),
    listenInvalid: oid("683300000000000000000506"),
    listenOutsidePeriod: oid("683300000000000000000507"),

    trackMonthlyStatOne: oid("683300000000000000000601"),
    trackMonthlyStatTwo: oid("683300000000000000000602"),
    trackMonthlyStatThree: oid("683300000000000000000603"),
};

const seedCollections = [
    {
        model: TrackMonthlyStat,
        ids: [
            ids.trackMonthlyStatOne,
            ids.trackMonthlyStatTwo,
            ids.trackMonthlyStatThree,
        ],
    },
    {
        model: ArtistRevenueSummary,
        ids: [],
    },
    {
        model: RevenuePeriod,
        ids: [],
    },
    {
        model: ListenEvent,
        ids: [
            ids.listenOne,
            ids.listenTwo,
            ids.listenThree,
            ids.listenFour,
            ids.listenFive,
            ids.listenInvalid,
            ids.listenOutsidePeriod,
        ],
    },
    {
        model: Transaction,
        ids: [
            ids.transactionOne,
            ids.transactionTwo,
            ids.transactionFailed,
            ids.transactionOutsidePeriod,
        ],
    },
    {
        model: Track,
        ids: [ids.trackOne, ids.trackTwo, ids.trackThree],
    },
    {
        model: Artist,
        ids: [ids.artistOne, ids.artistTwo],
    },
    {
        model: ArtistVerificationRequest,
        ids: [
            ids.artistVerificationRequestOne,
            ids.artistVerificationRequestTwo,
        ],
    },
    {
        model: Plan,
        ids: [ids.premiumPlan],
    },
    {
        model: User,
        ids: [
            ids.adminUser,
            ids.listenerUser,
            ids.artistUserOne,
            ids.artistUserTwo,
        ],
    },
];

const buildMonthContext = () => {
    const timezoneName = getRevenueDashboardTimezone();
    const monthDate = dayjs.tz("2001-01-01T00:00:00", timezoneName);
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
        targetMonth: monthDate.format("YYYY-MM"),
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
        if (entry.ids.length > 0) {
            await entry.model.deleteMany({ _id: { $in: entry.ids } });
        }
    }

    await RevenuePeriod.deleteMany({
        year: context.year,
        month: context.month,
    });

    await ArtistRevenueSummary.deleteMany({
        year: context.year,
        month: context.month,
        artistId: { $in: [ids.artistOne, ids.artistTwo] },
    });
};

const buildPasswords = async () => ({
    admin: await bcrypt.hash("Admin@123", 10),
    artist: await bcrypt.hash("Artist@123", 10),
    listener: await bcrypt.hash("Listener@123", 10),
});

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
            _id: ids.listenerUser,
            email: "listener.revenue.flow@reso.local",
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
                fullName: "Revenue Flow Listener",
                gender: "female",
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

const seedArtists = async () => {
    await Artist.insertMany([
        {
            _id: ids.artistOne,
            userId: ids.artistUserOne,
            name: "Flow Artist One",
            bio: "Artist seed de test chia doanh thu 60 phan tram.",
            avatar: "https://example.com/seed/flow-artist-one.jpg",
            coverImage: "https://example.com/seed/flow-artist-one-cover.jpg",
            activeStatus: "active",
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
            bio: "Artist seed de test chia doanh thu 40 phan tram.",
            avatar: "https://example.com/seed/flow-artist-two.jpg",
            coverImage: "https://example.com/seed/flow-artist-two-cover.jpg",
            activeStatus: "active",
            revenue: {
                totalEarnedAmount: 0,
                totalWithdrawnAmount: 0,
                availableAmount: 0,
                pendingPayoutAmount: 0,
                confirmedRevenueSummaryIds: [],
            },
        },
    ]);

    await ArtistVerificationRequest.insertMany([
        {
            _id: ids.artistVerificationRequestOne,
            artistId: ids.artistOne,
            userId: ids.artistUserOne,
            status: "closed",
            note: "Seeded as previously verified artist profile.",
        },
        {
            _id: ids.artistVerificationRequestTwo,
            artistId: ids.artistTwo,
            userId: ids.artistUserTwo,
            status: "closed",
            note: "Seeded as previously verified artist profile.",
        },
    ]);
};

const seedTracks = async (context) => {
    await Track.insertMany([
        {
            _id: ids.trackOne,
            title: "Revenue Flow Track One",
            artist_artistId: ids.artistOne,
            audioFiles: [
                {
                    url: "https://example.com/audio/revenue-flow-track-one.mp3",
                    format: "mp3",
                    bitrate: 320,
                    label: "original",
                    priority: 0,
                },
            ],
            duration: 210,
            releaseDate: context.periodStart,
            activeStatus: "active",
            approvalStatus: "approved",
            copyright: {
                declarationAccepted: true,
                copyrightStatus: "verified",
            },
        },
        {
            _id: ids.trackTwo,
            title: "Revenue Flow Track Two",
            artist_artistId: ids.artistOne,
            audioFiles: [
                {
                    url: "https://example.com/audio/revenue-flow-track-two.mp3",
                    format: "mp3",
                    bitrate: 320,
                    label: "original",
                    priority: 0,
                },
            ],
            duration: 185,
            releaseDate: context.periodStart,
            activeStatus: "active",
            approvalStatus: "approved",
            copyright: {
                declarationAccepted: true,
                copyrightStatus: "verified",
            },
        },
        {
            _id: ids.trackThree,
            title: "Revenue Flow Track Three",
            artist_artistId: ids.artistTwo,
            audioFiles: [
                {
                    url: "https://example.com/audio/revenue-flow-track-three.mp3",
                    format: "mp3",
                    bitrate: 320,
                    label: "original",
                    priority: 0,
                },
            ],
            duration: 200,
            releaseDate: context.periodStart,
            activeStatus: "active",
            approvalStatus: "approved",
            copyright: {
                declarationAccepted: true,
                copyrightStatus: "verified",
            },
        },
    ]);

    await TrackMonthlyStat.insertMany([
        {
            _id: ids.trackMonthlyStatOne,
            trackId: ids.trackOne,
            year: context.year,
            month: context.month,
            playCount: 2,
            uniqueListeners: 1,
        },
        {
            _id: ids.trackMonthlyStatTwo,
            trackId: ids.trackTwo,
            year: context.year,
            month: context.month,
            playCount: 1,
            uniqueListeners: 1,
        },
        {
            _id: ids.trackMonthlyStatThree,
            trackId: ids.trackThree,
            year: context.year,
            month: context.month,
            playCount: 2,
            uniqueListeners: 1,
        },
    ]);
};

const seedTransactions = async (context) => {
    const firstDay = dayjs(context.periodStart).add(2, "day").hour(9).toDate();
    const secondDay = dayjs(context.periodStart).add(10, "day").hour(20).toDate();
    const failedDay = dayjs(context.periodStart).add(15, "day").hour(14).toDate();
    const outsideDay = dayjs(context.periodStart).subtract(4, "day").hour(11).toDate();

    await Transaction.insertMany([
        {
            _id: ids.transactionOne,
            userId: ids.listenerUser,
            planId: ids.premiumPlan,
            amount: 100000,
            tax: 0,
            totalAmount: 100000,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            gatewayTransactionId: "FLOW-TXN-001",
            status: "success",
            paidAt: firstDay,
            invoiceNumber: "FLOW-INV-001",
        },
        {
            _id: ids.transactionTwo,
            userId: ids.listenerUser,
            planId: ids.premiumPlan,
            amount: 200000,
            tax: 0,
            totalAmount: 200000,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            gatewayTransactionId: "FLOW-TXN-002",
            status: "success",
            paidAt: secondDay,
            invoiceNumber: "FLOW-INV-002",
        },
        {
            _id: ids.transactionFailed,
            userId: ids.listenerUser,
            planId: ids.premiumPlan,
            amount: 500000,
            tax: 0,
            totalAmount: 500000,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            gatewayTransactionId: "FLOW-TXN-003",
            status: "failed",
            failedAt: failedDay,
            failureReason: "Seed failed transaction should be ignored.",
            invoiceNumber: "FLOW-INV-003",
        },
        {
            _id: ids.transactionOutsidePeriod,
            userId: ids.listenerUser,
            planId: ids.premiumPlan,
            amount: 150000,
            tax: 0,
            totalAmount: 150000,
            currency: "VND",
            paymentMethod: "vnpay",
            paymentGateway: "vnpay",
            gatewayTransactionId: "FLOW-TXN-004",
            status: "success",
            paidAt: outsideDay,
            invoiceNumber: "FLOW-INV-004",
        },
    ]);
};

const buildListenEvent = ({
    _id,
    userId,
    trackId,
    artistId,
    listenedAt,
    isValidStream,
}) => ({
    _id,
    userId,
    trackId,
    artistId,
    listenedAt,
    trackDuration: 210,
    listenedDuration: isValidStream ? 190 : 12,
    listenPercent: isValidStream ? 90 : 5,
    dailyListenOrder: 1,
    requiredPercent: 50,
    source: "track_detail",
    isValidStream,
    duration: isValidStream ? 190 : 12,
    completed: isValidStream,
    skipped: !isValidStream,
    device: "web",
    country: "VN",
});

const seedListenEvents = async (context) => {
    await ListenEvent.insertMany([
        buildListenEvent({
            _id: ids.listenOne,
            userId: ids.listenerUser,
            trackId: ids.trackOne,
            artistId: ids.artistOne,
            listenedAt: dayjs(context.periodStart).add(3, "day").hour(8).toDate(),
            isValidStream: true,
        }),
        buildListenEvent({
            _id: ids.listenTwo,
            userId: ids.listenerUser,
            trackId: ids.trackOne,
            artistId: ids.artistOne,
            listenedAt: dayjs(context.periodStart).add(4, "day").hour(9).toDate(),
            isValidStream: true,
        }),
        buildListenEvent({
            _id: ids.listenThree,
            userId: ids.listenerUser,
            trackId: ids.trackTwo,
            artistId: ids.artistOne,
            listenedAt: dayjs(context.periodStart).add(5, "day").hour(10).toDate(),
            isValidStream: true,
        }),
        buildListenEvent({
            _id: ids.listenFour,
            userId: ids.listenerUser,
            trackId: ids.trackThree,
            artistId: ids.artistTwo,
            listenedAt: dayjs(context.periodStart).add(6, "day").hour(11).toDate(),
            isValidStream: true,
        }),
        buildListenEvent({
            _id: ids.listenFive,
            userId: ids.listenerUser,
            trackId: ids.trackThree,
            artistId: ids.artistTwo,
            listenedAt: dayjs(context.periodStart).add(8, "day").hour(12).toDate(),
            isValidStream: true,
        }),
        buildListenEvent({
            _id: ids.listenInvalid,
            userId: ids.listenerUser,
            trackId: ids.trackTwo,
            artistId: ids.artistOne,
            listenedAt: dayjs(context.periodStart).add(9, "day").hour(13).toDate(),
            isValidStream: false,
        }),
        buildListenEvent({
            _id: ids.listenOutsidePeriod,
            userId: ids.listenerUser,
            trackId: ids.trackThree,
            artistId: ids.artistTwo,
            listenedAt: dayjs(context.periodStart).subtract(2, "day").hour(9).toDate(),
            isValidStream: true,
        }),
    ]);
};

const main = async () => {
    const context = buildMonthContext();
    const totalPremiumRevenue = 300000;
    const totalEligibleStreams = 5;
    const totalArtistPool = roundCurrency(
        totalPremiumRevenue * ARTIST_REVENUE_SHARE_RATIO
    );
    const totalPlatformRevenue = totalPremiumRevenue - totalArtistPool;
    const artistOneShare = roundCurrency(totalArtistPool * (3 / 5));
    const artistTwoShare = roundCurrency(totalArtistPool * (2 / 5));

    await connectDatabase();
    await ensureIndexes();
    await cleanupSeedData(context);

    const passwords = await buildPasswords();

    await seedUsers(passwords);
    await seedPlan();
    await seedArtists();
    await seedTracks(context);
    await seedTransactions(context);
    await seedListenEvents(context);

    console.log("Revenue flow seed completed successfully.");
    console.log(`Timezone: ${context.timezoneName}`);
    console.log(`Target month for testing: ${context.targetMonth}`);
    console.log("");
    console.log("Seed accounts:");
    console.log("  admin.revenue.flow@reso.local / Admin@123");
    console.log("  listener.revenue.flow@reso.local / Listener@123");
    console.log("  artist.one.flow@reso.local / Artist@123");
    console.log("  artist.two.flow@reso.local / Artist@123");
    console.log("");
    console.log("Expected flow after running revenue aggregation:");
    console.log(`  Premium revenue: ${totalPremiumRevenue}`);
    console.log(`  Successful transactions: 2`);
    console.log(`  Eligible streams: ${totalEligibleStreams}`);
    console.log(`  Artist pool: ${totalArtistPool}`);
    console.log(`  Platform revenue: ${totalPlatformRevenue}`);
    console.log(`  Artist One expected revenue: ${artistOneShare}`);
    console.log(`  Artist Two expected revenue: ${artistTwoShare}`);
    console.log("");
    console.log("Suggested test steps:");
    console.log(`  1. npm run revenue:sync -- ${context.targetMonth}`);
    console.log("  2. GET /api/admin/revenue/periods to lấy period id");
    console.log("  3. POST /api/admin/revenue/periods/:id/actions");
    console.log('     body: { "action": "close" | "calculate" | "confirm" }');
};

main()
    .catch((error) => {
        console.error("Revenue flow seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
