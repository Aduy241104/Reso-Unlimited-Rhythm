import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectMongoose from "../src/config/db.js";
import models from "../src/models/index.js";

dotenv.config();

const {
    Artist,
    ArtistRevenueSummary,
    ListenEvent,
    Podcast,
    PodcastMonthlyStat,
    RevenuePeriod,
    Transaction,
    User,
} = models;

const SEED_YEAR = 2026;
const SEED_MONTH = 6;
const SEED_PREFIX = "7f";
const SEED_PASSWORD = process.env.PODCAST_SEED_PASSWORD || "Seed@123";
const STREAM_COUNTS = [45, 90, 135];
const REVENUE_AMOUNTS = [1_333_333, 2_000_000, 2_666_667];
const TOTAL_ARTIST_POOL = REVENUE_AMOUNTS.reduce((sum, amount) => sum + amount, 0);

const seedObjectId = (scope, index) =>
    new mongoose.Types.ObjectId(
        `${SEED_PREFIX}${scope.toString(16).padStart(2, "0")}${index
            .toString(16)
            .padStart(20, "0")}`
    );

const seedGuestId = (index) =>
    `8f000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;

const ensureDocument = async (Model, id, fields) => {
    const existing = await Model.findById(id).lean();

    if (existing) {
        return existing;
    }

    return (await Model.create({ _id: id, ...fields })).toObject();
};

const ensureSeedArtistUser = async () => {
    const userId = seedObjectId(1, 1);
    const password = await bcrypt.hash(SEED_PASSWORD, 10);
    const userFields = {
        email: "seed.podcast.june.artist@gmail.com",
        password,
        authProvider: "local",
        role: "artist",
        activeStatus: "active",
        emailVerified: true,
        profile: { fullName: "Podcast Seed Artist" },
    };
    const existing = await User.findById(userId).lean();

    if (!existing) {
        return (await User.create({ _id: userId, ...userFields })).toObject();
    }

    return User.findByIdAndUpdate(
        userId,
        {
            $set: userFields,
            $unset: { googleId: "" },
        },
        { new: true, lean: true }
    );
};

const buildPodcastSeedData = ({ artistId, index }) => ({
    _id: seedObjectId(10 + index, 1),
    creator: artistId,
    title: `Podcast mẫu tháng 06 - Tập ${index}`,
    description: `Dữ liệu mẫu podcast phục vụ kiểm tra doanh thu kỳ tháng 06/${SEED_YEAR}.`,
    audioUrl: `https://cdn.example.com/seed/podcast-june-${index}.mp3`,
    coverImageUrl: `https://cdn.example.com/seed/podcast-june-${index}.jpg`,
    duration: 1800 + index * 300,
    releaseDate: new Date(`2026-06-${String(5 + index).padStart(2, "0")}T08:00:00+07:00`),
    releaseStatus: "released",
    releasedAt: new Date(`2026-06-${String(5 + index).padStart(2, "0")}T08:00:00+07:00`),
    approvalStatus: "approved",
    visibility: "public",
    isBlocked: false,
    copyrightType: "original",
    copyrightConfirmed: true,
    stats: { totalListen: STREAM_COUNTS[index - 1] },
});

const buildListenEvents = ({ podcast, artistId, podcastIndex }) => {
    const streamCount = STREAM_COUNTS[podcastIndex - 1];
    const events = [];

    for (let index = 1; index <= streamCount; index += 1) {
        const eventIndex = (podcastIndex - 1) * 200 + index;
        const listenedAt = new Date(
            `2026-06-${String(7 + ((index - 1) % 20)).padStart(2, "0")}T${String(
                8 + ((index - 1) % 10)
            ).padStart(2, "0")}:00:00+07:00`
        );

        events.push({
            _id: seedObjectId(20, eventIndex),
            guestId: seedGuestId(eventIndex),
            contentType: "podcast",
            trackId: null,
            podcastId: podcast._id,
            artistId,
            listenedAt,
            trackDuration: podcast.duration,
            listenedDuration: podcast.duration,
            listenPercent: 100,
            requiredPercent: 50,
            source: "podcast_detail",
            isValidStream: true,
            duration: podcast.duration,
            completed: true,
            skipped: false,
        });
    }

    return events;
};

const ensureRevenuePeriod = async ({ periodStart, periodEnd, totalEligibleStreams }) => {
    const existing = await RevenuePeriod.findOne({
        year: SEED_YEAR,
        month: SEED_MONTH,
    }).lean();

    if (existing) {
        return existing;
    }

    return RevenuePeriod.create({
        _id: seedObjectId(40, 1),
        year: SEED_YEAR,
        month: SEED_MONTH,
        periodStart,
        periodEnd,
        status: "calculated",
        totalPremiumRevenue: 10_000_000,
        totalArtistPool: TOTAL_ARTIST_POOL,
        totalPlatformRevenue: 4_000_000,
        totalEligibleStreams,
        successfulTransactions: 1,
        lastAggregatedAt: new Date("2026-07-01T02:00:00.000Z"),
        calculatedAt: new Date("2026-07-02T02:00:00.000Z"),
        closedAt: new Date("2026-07-01T02:00:00.000Z"),
    });
};

const ensureTransaction = async (userId) => {
    const transactionId = seedObjectId(50, 1);
    const existing = await Transaction.findById(transactionId).lean();

    if (existing) {
        return existing;
    }

    return Transaction.create({
        _id: transactionId,
        userId,
        amount: 10_000_000,
        totalAmount: 10_000_000,
        tax: 0,
        currency: "VND",
        paymentMethod: "vnpay",
        paymentGateway: "vnpay",
        clientPlatform: "web",
        gatewayTransactionId: "SEED-PODCAST-JUNE-2026-001",
        status: "success",
        paidAt: new Date("2026-06-15T04:00:00.000Z"),
        invoiceNumber: "SEED-PODCAST-JUNE-2026-001",
        confirmationEmailStatus: "sent",
        confirmationEmailSentAt: new Date("2026-06-15T04:05:00.000Z"),
    });
};

const seedPodcastJuneRevenue = async () => {
    const user = await ensureSeedArtistUser();

    const artist = await ensureDocument(Artist, seedObjectId(2, 1), {
        userId: user._id,
        name: "Podcast Seed Artist",
        bio: "Artist dùng cho dữ liệu mẫu podcast tháng 06/2026.",
        activeStatus: "active",
    });

    const podcasts = [];
    const allEvents = [];

    for (let index = 1; index <= 3; index += 1) {
        const podcastSeed = buildPodcastSeedData({ artistId: artist._id, index });
        const podcast = await ensureDocument(Podcast, podcastSeed._id, podcastSeed);
        const events = buildListenEvents({
            podcast,
            artistId: artist._id,
            podcastIndex: index,
        });

        podcasts.push(podcast);
        allEvents.push(...events);
    }

    const existingEventIds = await ListenEvent.find({
        _id: { $in: allEvents.map((event) => event._id) },
    })
        .select("_id")
        .lean();
    const existingEventIdSet = new Set(existingEventIds.map((event) => String(event._id)));
    const newEvents = allEvents.filter((event) => !existingEventIdSet.has(String(event._id)));

    if (newEvents.length > 0) {
        await ListenEvent.insertMany(newEvents, { ordered: true });
    }

    const newEventsByPodcast = new Map();
    newEvents.forEach((event) => {
        const key = String(event.podcastId);
        newEventsByPodcast.set(key, (newEventsByPodcast.get(key) || 0) + 1);
    });

    await Promise.all(
        podcasts.map((podcast) => {
            const newCount = newEventsByPodcast.get(String(podcast._id)) || 0;

            return newCount > 0
                ? Podcast.updateOne(
                    { _id: podcast._id },
                    { $inc: { "stats.totalListen": newCount } }
                )
                : null;
        })
    );

    const periodStart = new Date("2026-06-01T00:00:00+07:00");
    const periodEnd = new Date("2026-07-01T00:00:00+07:00");
    const totalEligibleStreams = STREAM_COUNTS.reduce((sum, count) => sum + count, 0);

    await ensureRevenuePeriod({ periodStart, periodEnd, totalEligibleStreams });
    await ensureTransaction(user._id);

    await Promise.all(
        podcasts.map((podcast, index) =>
            PodcastMonthlyStat.updateOne(
                {
                    podcastId: podcast._id,
                    year: SEED_YEAR,
                    month: SEED_MONTH,
                },
                {
                    $setOnInsert: {
                        podcastId: podcast._id,
                        year: SEED_YEAR,
                        month: SEED_MONTH,
                        listenCount: STREAM_COUNTS[index],
                        eligibleStreams: STREAM_COUNTS[index],
                        revenue: {
                            eligibleStreams: STREAM_COUNTS[index],
                            revenueAmount: REVENUE_AMOUNTS[index],
                            artistRevenueAmount: REVENUE_AMOUNTS[index],
                            calculatedAt: new Date("2026-07-02T02:00:00.000Z"),
                        },
                    },
                },
                { upsert: true }
            )
        )
    );

    await ArtistRevenueSummary.updateOne(
        {
            artistId: artist._id,
            year: SEED_YEAR,
            month: SEED_MONTH,
        },
        {
            $setOnInsert: {
                artistId: artist._id,
                year: SEED_YEAR,
                month: SEED_MONTH,
                totalEligibleStreams,
                grossRevenueAmount: 10_000_000,
                artistRevenueAmount: TOTAL_ARTIST_POOL,
                platformRevenueAmount: 4_000_000,
                availableAmount: TOTAL_ARTIST_POOL,
                status: "calculated",
                calculatedAt: new Date("2026-07-02T02:00:00.000Z"),
            },
        },
        { upsert: true }
    );

    console.log("Podcast June revenue seed completed.");
    console.log(`Podcasts: ${podcasts.length}`);
    console.log(`New listen events inserted: ${newEvents.length}`);
    console.log(`Podcast monthly revenue records: ${podcasts.length}`);
    console.log(`Total eligible streams: ${totalEligibleStreams}`);
    console.log(`Total artist revenue: ${TOTAL_ARTIST_POOL.toLocaleString("vi-VN")} VND`);
    console.log(`Seed artist login: seed.podcast.june.artist@gmail.com / ${SEED_PASSWORD}`);
};

await connectMongoose();

try {
    await seedPodcastJuneRevenue();
} catch (error) {
    console.error("Podcast June revenue seed failed:", error);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
