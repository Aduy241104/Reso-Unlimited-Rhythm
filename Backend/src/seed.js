import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";
import models from "./models/index.js";

dotenv.config();

const {
    Album,
    Artist,
    ArtistMonthlyStat,
    ArtistRequest,
    ArtistStat,
    AuditLog,
    Episode,
    Genre,
    Interaction,
    ListenEvent,
    Notification,
    Plan,
    Playlist,
    Podcast,
    RefreshToken,
    ReleaseSchedule,
    Report,
    SearchEvent,
    Subscription,
    Track,
    TrackDailyStat,
    TrackMonthlyStat,
    Transaction,
    User,
    UserListeningStat,
    VerificationToken,
} = models;

const oid = (value) => new mongoose.Types.ObjectId(value);

const ids = {
    planFree: oid("681300000000000000000001"),
    planPremium: oid("681300000000000000000002"),

    userAdmin: oid("681300000000000000000101"),
    userArtist: oid("681300000000000000000102"),
    userListener: oid("681300000000000000000103"),
    userApplicant: oid("681300000000000000000104"),

    genreLofi: oid("681300000000000000000201"),
    genrePop: oid("681300000000000000000202"),
    genreTalk: oid("681300000000000000000203"),

    artistMain: oid("681300000000000000000301"),
    artistRequest: oid("681300000000000000000302"),
    artistStat: oid("681300000000000000000303"),
    artistMonthlyStat: oid("681300000000000000000304"),

    albumMain: oid("681300000000000000000401"),

    trackSunrise: oid("681300000000000000000501"),
    trackCityLights: oid("681300000000000000000502"),
    trackDailyStat: oid("681300000000000000000503"),
    trackMonthlyStat: oid("681300000000000000000504"),

    podcastMain: oid("681300000000000000000601"),
    episodeFocus: oid("681300000000000000000701"),

    playlistMain: oid("681300000000000000000801"),

    subscriptionMain: oid("681300000000000000000901"),
    transactionMain: oid("681300000000000000000902"),

    refreshTokenMain: oid("681300000000000000000a01"),
    verificationTokenMain: oid("681300000000000000000a02"),

    searchEventMain: oid("681300000000000000000b01"),
    listenTrackMain: oid("681300000000000000000b02"),
    listenEpisodeMain: oid("681300000000000000000b03"),
    interactionTrackLike: oid("681300000000000000000b04"),
    interactionArtistFollow: oid("681300000000000000000b05"),

    notificationUser: oid("681300000000000000000c01"),
    notificationGlobal: oid("681300000000000000000c02"),

    reportMain: oid("681300000000000000000d01"),
    releaseScheduleMain: oid("681300000000000000000d02"),

    userListeningStatMain: oid("681300000000000000000e01"),
    auditLogMain: oid("681300000000000000000f01"),
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(Date.now() - days * DAY_IN_MS);
const daysFromNow = (days) => new Date(Date.now() + days * DAY_IN_MS);

const seedCollections = [
    { model: AuditLog, ids: [ids.auditLogMain] },
    { model: Notification, ids: [ids.notificationUser, ids.notificationGlobal] },
    { model: Interaction, ids: [ids.interactionTrackLike, ids.interactionArtistFollow] },
    { model: ListenEvent, ids: [ids.listenTrackMain, ids.listenEpisodeMain] },
    { model: SearchEvent, ids: [ids.searchEventMain] },
    { model: Report, ids: [ids.reportMain] },
    { model: ReleaseSchedule, ids: [ids.releaseScheduleMain] },
    { model: RefreshToken, ids: [ids.refreshTokenMain] },
    { model: VerificationToken, ids: [ids.verificationTokenMain] },
    { model: Transaction, ids: [ids.transactionMain] },
    { model: Subscription, ids: [ids.subscriptionMain] },
    { model: UserListeningStat, ids: [ids.userListeningStatMain] },
    { model: TrackDailyStat, ids: [ids.trackDailyStat] },
    { model: TrackMonthlyStat, ids: [ids.trackMonthlyStat] },
    { model: Playlist, ids: [ids.playlistMain] },
    { model: Episode, ids: [ids.episodeFocus] },
    { model: Podcast, ids: [ids.podcastMain] },
    { model: Track, ids: [ids.trackSunrise, ids.trackCityLights] },
    { model: Album, ids: [ids.albumMain] },
    { model: ArtistMonthlyStat, ids: [ids.artistMonthlyStat] },
    { model: ArtistStat, ids: [ids.artistStat] },
    { model: ArtistRequest, ids: [ids.artistRequest] },
    { model: Artist, ids: [ids.artistMain] },
    { model: Genre, ids: [ids.genreLofi, ids.genrePop, ids.genreTalk] },
    {
        model: User,
        ids: [ids.userAdmin, ids.userArtist, ids.userListener, ids.userApplicant],
    },
    { model: Plan, ids: [ids.planFree, ids.planPremium] },
];

const connectDatabase = async () => {
    if (!process.env.DATABASE) {
        throw new Error("Missing DATABASE in .env");
    }

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

const seedPlans = async () => {
    await Plan.insertMany([
        {
            _id: ids.planFree,
            name: "Seed Free",
            price: 0,
            durationDays: 30,
            description: "Goi mien phi danh cho tai khoan moi.",
            features: [],
            status: "active",
        },
        {
            _id: ids.planPremium,
            name: "Seed Premium",
            price: 99000,
            durationDays: 30,
            description: "Goi premium mau de test thanh toan va subscription.",
            features: [
                "NO_ADS",
                "HIGH_QUALITY_AUDIO",
                "UNLIMITED_SKIP",
                "OFFLINE_DOWNLOAD",
                "BACKGROUND_PLAY",
                "AI_SMART_PLAYLIST",
            ],
            status: "active",
        },
    ]);
};

const seedUsers = async (passwords) => {
    await User.insertMany([
        {
            _id: ids.userAdmin,
            email: "admin.seed@reso.local",
            password: passwords.admin,
            role: "admin",
            activeStatus: "active",
            avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a",
            profile: {
                fullName: "Seed Admin",
                gender: "other",
                dateOfBirth: new Date("1992-08-15"),
                country: "Vietnam",
            },
            settings: {
                language: "vi",
                notificationsEnabled: true,
                shufflePlayDefault: false,
            },
            stats: {
                totalListeningTime: 8400,
                totalTracksPlayed: 312,
            },
        },
        {
            _id: ids.userArtist,
            email: "artist.seed@reso.local",
            password: passwords.artist,
            role: "artist",
            activeStatus: "active",
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
            profile: {
                fullName: "Le Minh Artist",
                gender: "male",
                dateOfBirth: new Date("1996-03-22"),
                country: "Vietnam",
            },
            settings: {
                language: "vi",
                notificationsEnabled: true,
                shufflePlayDefault: true,
            },
            stats: {
                totalListeningTime: 12600,
                totalTracksPlayed: 420,
            },
        },
        {
            _id: ids.userListener,
            email: "listener.seed@reso.local",
            password: passwords.listener,
            role: "user",
            activeStatus: "active",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
            profile: {
                fullName: "Nguyen Hoang Listener",
                gender: "female",
                dateOfBirth: new Date("2001-11-02"),
                country: "Vietnam",
            },
            settings: {
                language: "vi",
                notificationsEnabled: true,
                shufflePlayDefault: false,
            },
            subscription: {
                isPremium: true,
                currentPlanId: ids.planPremium,
                premiumEndDate: daysFromNow(25),
            },
            stats: {
                totalListeningTime: 22800,
                totalTracksPlayed: 786,
            },
        },
        {
            _id: ids.userApplicant,
            email: "applicant.seed@reso.local",
            password: passwords.applicant,
            role: "user",
            activeStatus: "active",
            avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
            profile: {
                fullName: "Tran Minh Applicant",
                gender: "male",
                dateOfBirth: new Date("2000-05-17"),
                country: "Vietnam",
            },
            settings: {
                language: "en",
                notificationsEnabled: true,
                shufflePlayDefault: false,
            },
            stats: {
                totalListeningTime: 3600,
                totalTracksPlayed: 96,
            },
        },
    ]);
};

const seedGenres = async () => {
    await Genre.insertMany([
        {
            _id: ids.genreLofi,
            name: "Seed Lofi",
            description: "Dong nhac lo-fi nhe va tap trung.",
            image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
            isActive: true,
        },
        {
            _id: ids.genrePop,
            name: "Seed Pop",
            description: "Nhac pop de nghe cho cac playlist thinh hanh.",
            image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
            isActive: true,
        },
        {
            _id: ids.genreTalk,
            name: "Seed Talk",
            description: "Noi dung podcast va talk show.",
            image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618",
            isActive: true,
        },
    ]);
};

const seedArtistData = async () => {
    await Artist.create({
        _id: ids.artistMain,
        userId: ids.userArtist,
        name: "Seed Waves",
        bio: "Du an artist mau de test luong du lieu am nhac.",
        avatar: "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
        coverImage: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
        socialLinks: {
            facebook: "https://facebook.com/seedwaves",
            instagram: "https://instagram.com/seedwaves",
            youtube: "https://youtube.com/@seedwaves",
        },
        verificationStatus: "verified",
        stats: {
            followers: 5200,
            totalStreams: 128450,
        },
        activeStatus: "active",
    });

    await ArtistRequest.create({
        _id: ids.artistRequest,
        userId: ids.userApplicant,
        stageName: "Neon Applicant",
        bio: "Ho so dang ky nghe si mau de test quy trinh duyet.",
        avatar: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518",
        genres: ["Seed Pop", "Seed Lofi"],
        country: "Vietnam",
        socialLinks: {
            spotify: "https://open.spotify.com/artist/seed-applicant",
            youtube: "https://youtube.com/@neonapplicant",
            tiktok: "https://tiktok.com/@neonapplicant",
            facebook: "https://facebook.com/neonapplicant",
        },
        identityInfo: {
            idNumber: "079203000999",
            fullName: "Tran Minh Applicant",
            dateOfBirth: new Date("2000-05-17"),
            frontImage: "https://images.unsplash.com/photo-1586281380349-632531db7ed4",
            backImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9",
        },
        status: "approved",
        reviewedBy: ids.userAdmin,
        reviewedAt: daysAgo(5),
    });

    await ArtistStat.create({
        _id: ids.artistStat,
        artistId: ids.artistMain,
        totalStreams: 128450,
        totalFollowers: 5200,
        monthlyListeners: 18200,
        demographics: {
            ageGroups: {
                "18-24": 42,
                "25-34": 37,
            },
            gender: {
                male: 48,
                female: 46,
                other: 6,
            },
            countries: {
                Vietnam: 74,
                Japan: 12,
                Korea: 8,
            },
        },
    });

    const now = new Date();
    await ArtistMonthlyStat.create({
        _id: ids.artistMonthlyStat,
        artistId: ids.artistMain,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        newFollowers: 320,
        totalFollowers: 5200,
        totalStreams: 18450,
    });
};

const seedMusicCatalog = async () => {
    await Album.create({
        _id: ids.albumMain,
        title: "Midnight Seed",
        artistId: ids.artistMain,
        coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
        trackList: [],
        releaseDate: daysAgo(30),
        status: "active",
        totalPlays: 21345,
    });

    await Track.insertMany([
        {
            _id: ids.trackSunrise,
            title: "Sunrise Cache",
            artist_artistId: ids.artistMain,
            album_albumId: ids.albumMain,
            genreIds: [ids.genreLofi, ids.genrePop],
            audioFiles: [
                "https://example.com/audio/sunrise-cache.mp3",
            ],
            duration: 228,
            avatar: "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
            coverImage: [
                "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
            ],
            lyricsStatic: "Caching dreams until the city wakes up.",
            lyricsSyncUrl: "https://example.com/lyrics/sunrise-cache.lrc",
            stats: {
                totalLike: 950,
                totalPlay: 15400,
            },
            releaseDate: daysAgo(21),
            activeStatus: "active",
            approvalStatus: "approved",
        },
        {
            _id: ids.trackCityLights,
            title: "City Lights Commit",
            artist_artistId: ids.artistMain,
            album_albumId: ids.albumMain,
            genreIds: [ids.genrePop],
            audioFiles: [
                "https://example.com/audio/city-lights-commit.mp3",
            ],
            duration: 245,
            avatar: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
            coverImage: [
                "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
            ],
            lyricsStatic: "Every neon line compiles into a chorus.",
            lyricsSyncUrl: "https://example.com/lyrics/city-lights-commit.lrc",
            stats: {
                totalLike: 620,
                totalPlay: 5945,
            },
            releaseDate: daysAgo(10),
            activeStatus: "active",
            approvalStatus: "approved",
        },
    ]);

    await Album.findByIdAndUpdate(ids.albumMain, {
        trackList: [
            { trackId: ids.trackSunrise, order: 1 },
            { trackId: ids.trackCityLights, order: 2 },
        ],
    });
};

const seedPodcastData = async () => {
    await Podcast.create({
        _id: ids.podcastMain,
        title: "Seed Stories",
        artistId: ids.artistMain,
        description: "Podcast mau de test episode, follow va nghe.",
        coverImage: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618",
        trailerUrl: "https://example.com/audio/seed-stories-trailer.mp3",
        stats: {
            followers: 860,
            totalPlays: 4410,
        },
        activeStatus: "active",
    });

    await Episode.create({
        _id: ids.episodeFocus,
        podcastId: ids.podcastMain,
        title: "Focus Session 01",
        description: "Tap podcast mau huong dan tap trung khi hoc va lam viec.",
        thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
        audioFiles: [
            "https://example.com/audio/focus-session-01.mp3",
        ],
        duration: 1800,
        stats: {
            totalPlay: 1880,
            totalLikes: 210,
        },
        activeStatus: "active",
    });
};

const seedUserContent = async () => {
    await Playlist.create({
        _id: ids.playlistMain,
        userId: ids.userListener,
        title: "Seed Chill Mix",
        description: "Playlist mau gom cac bai nhac de test danh sach phat.",
        type: "user",
        coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4",
        isPublic: true,
        isHidden: false,
        trackCount: 2,
        totalDuration: 473,
        tracks: [
            { trackId: ids.trackSunrise, order: 0, addedAt: daysAgo(7) },
            { trackId: ids.trackCityLights, order: 1, addedAt: daysAgo(6) },
        ],
    });
};

const seedCommerce = async () => {
    await Subscription.create({
        _id: ids.subscriptionMain,
        userId: ids.userListener,
        planId: ids.planPremium,
        status: "active",
        startDate: daysAgo(5),
        endDate: daysFromNow(25),
        autoRenew: true,
    });

    await Transaction.create({
        _id: ids.transactionMain,
        userId: ids.userListener,
        subscriptionId: ids.subscriptionMain,
        planId: ids.planPremium,
        amount: 99000,
        tax: 0,
        totalAmount: 99000,
        currency: "VND",
        paymentMethod: "vnpay",
        paymentGateway: "vnpay",
        gatewayTransactionId: "SEED-VNPAY-0001",
        status: "success",
        paidAt: daysAgo(5),
        invoiceNumber: "SEED-INV-0001",
    });
};

const seedAuthArtifacts = async (passwords) => {
    await RefreshToken.create({
        _id: ids.refreshTokenMain,
        userId: ids.userListener,
        token: "seed-refresh-token-listener-0001",
        expiresAt: daysFromNow(30),
        isRevoked: false,
    });

    await VerificationToken.create({
        _id: ids.verificationTokenMain,
        userId: null,
        email: "pending.seed@reso.local",
        token: "seed-verification-token-0001",
        otp: "123456",
        type: "verify_email",
        expiresAt: daysFromNow(2),
        isUsed: false,
        payload: {
            username: "",
            password: passwords.pendingUser,
            fullName: "Pending Seed User",
        },
    });
};

const seedActivity = async () => {
    await SearchEvent.create({
        _id: ids.searchEventMain,
        userId: ids.userListener,
        keyword: "seed waves sunrise",
        clickedTrackId: ids.trackSunrise,
    });

    await ListenEvent.insertMany([
        {
            _id: ids.listenTrackMain,
            userId: ids.userListener,
            trackId: ids.trackSunrise,
            artistId: ids.artistMain,
            listenedAt: daysAgo(1),
            duration: 228,
            completed: true,
            skipped: false,
            device: "web",
            country: "Vietnam",
        },
        {
            _id: ids.listenEpisodeMain,
            userId: ids.userListener,
            podcastId: ids.podcastMain,
            episodeId: ids.episodeFocus,
            listenedAt: daysAgo(2),
            duration: 1320,
            completed: false,
            skipped: false,
            device: "mobile",
            country: "Vietnam",
        },
    ]);

    await Interaction.insertMany([
        {
            _id: ids.interactionTrackLike,
            userId: ids.userListener,
            targetType: "Track",
            targetId: ids.trackSunrise,
            action: "like",
        },
        {
            _id: ids.interactionArtistFollow,
            userId: ids.userListener,
            targetType: "Artist",
            targetId: ids.artistMain,
            action: "follow",
        },
    ]);

    await Notification.insertMany([
        {
            _id: ids.notificationUser,
            userId: ids.userListener,
            type: "subscription",
            title: "Gia han premium thanh cong",
            content: "Tai khoan mau da duoc gia han Seed Premium.",
            actorId: ids.userAdmin,
            actorType: "admin",
            targetId: ids.planPremium,
            targetType: "plan",
            receiverType: "single",
            isGlobal: false,
            createdBy: ids.userAdmin,
            isDeleted: false,
        },
        {
            _id: ids.notificationGlobal,
            type: "new_release",
            title: "Seed Waves vua phat hanh track moi",
            content: "Track City Lights Commit da san sang de test thong bao.",
            actorId: ids.artistMain,
            actorType: "artist",
            targetId: ids.trackCityLights,
            targetType: "track",
            receiverType: "all",
            isGlobal: true,
            createdBy: ids.userAdmin,
            isDeleted: false,
        },
    ]);
};

const seedModerationAndStats = async () => {
    await Report.create({
        _id: ids.reportMain,
        userId: ids.userListener,
        targetId: ids.trackCityLights,
        targetType: "track",
        reason: "Nghi ngo metadata sai",
        description: "Thong tin lyrics can duoc kiem tra lai trong ban seed.",
        images: [
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
        ],
        status: "resolved",
        handledBy: ids.userAdmin,
        handledAt: daysAgo(1),
        resolution: "warning",
        resolutionNote: "Bao cao duoc xu ly de minh hoa luong moderation.",
    });

    await ReleaseSchedule.create({
        _id: ids.releaseScheduleMain,
        type: "track",
        targetId: ids.trackCityLights,
        artistId: ids.artistMain,
        scheduledAt: daysFromNow(7),
        status: "scheduled",
    });

    await TrackDailyStat.create({
        _id: ids.trackDailyStat,
        trackId: ids.trackSunrise,
        date: daysAgo(1),
        playCount: 180,
        uniqueListeners: 124,
        skipCount: 18,
    });

    const now = new Date();
    await TrackMonthlyStat.create({
        _id: ids.trackMonthlyStat,
        trackId: ids.trackSunrise,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        playCount: 4120,
        uniqueListeners: 2860,
    });

    await UserListeningStat.create({
        _id: ids.userListeningStatMain,
        userId: ids.userListener,
        year: now.getFullYear(),
        week: 18,
        stats_totalListeningTime: 6840,
        stats_totalTracksPlayed: 42,
        topGenres: [
            {
                genreId: ids.genreLofi,
                genreName: "Seed Lofi",
                playCount: 24,
                listeningTime: 3200,
            },
            {
                genreId: ids.genrePop,
                genreName: "Seed Pop",
                playCount: 18,
                listeningTime: 2100,
            },
        ],
        topTracks: [
            {
                trackId: ids.trackSunrise,
                title: "Sunrise Cache",
                playCount: 17,
                listeningTime: 3876,
            },
            {
                trackId: ids.trackCityLights,
                title: "City Lights Commit",
                playCount: 12,
                listeningTime: 2940,
            },
        ],
        topArtists: [
            {
                artistId: ids.artistMain,
                name: "Seed Waves",
                playCount: 29,
            },
        ],
    });

    await AuditLog.create({
        _id: ids.auditLogMain,
        actorId: ids.userAdmin,
        action: "report.resolve",
        targetType: "Report",
        targetId: ids.reportMain,
        reason: "Seed du lieu moderation cho he thong.",
        metadata: {
            before: {
                status: "pending",
            },
            after: {
                status: "resolved",
                resolution: "warning",
            },
            note: "Du lieu mau duoc tao tu dong bang file seed.",
        },
        ipAddress: "127.0.0.1",
        userAgent: "seed-script",
    });
};

const buildPasswords = async () => ({
    admin: await bcrypt.hash("Admin@123", 10),
    artist: await bcrypt.hash("Artist@123", 10),
    listener: await bcrypt.hash("Listener@123", 10),
    applicant: await bcrypt.hash("Applicant@123", 10),
    pendingUser: await bcrypt.hash("Pending@123", 10),
});

const main = async () => {
    const passwords = await buildPasswords();

    await connectDatabase();
    await ensureIndexes();
    await cleanupSeedData();

    await seedPlans();
    await seedUsers(passwords);
    await seedGenres();
    await seedArtistData();
    await seedMusicCatalog();
    await seedPodcastData();
    await seedUserContent();
    await seedCommerce();
    await seedAuthArtifacts(passwords);
    await seedActivity();
    await seedModerationAndStats();

    console.log("Seed completed successfully.");
    console.log("Sample accounts:");
    console.log("  admin.seed@reso.local / Admin@123");
    console.log("  artist.seed@reso.local / Artist@123");
    console.log("  listener.seed@reso.local / Listener@123");
    console.log("  applicant.seed@reso.local / Applicant@123");
};

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
