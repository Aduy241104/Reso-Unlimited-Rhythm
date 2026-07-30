import bcrypt from "bcrypt";
import crypto from "crypto";
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
    Album,
    Artist,
    ArtistDailyStat,
    ArtistMonthlyStat,
    ArtistRanking,
    ArtistRequest,
    ArtistRevenueSummary,
    ArtistStat,
    ArtistVerificationRequest,
    Genre,
    Interaction,
    ListenEvent,
    Notification,
    PersonalizedMix,
    Plan,
    PlatformMonthlyStat,
    Playlist,
    RefreshToken,
    ReleaseSchedule,
    Report,
    RevenuePeriod,
    SearchEvent,
    Subscription,
    Track,
    TrackDailyRanking,
    TrackDailyStat,
    TrackMonthlyRanking,
    TrackMonthlyStat,
    Transaction,
    User,
    UserRecentListeningActivity,
    VerificationToken,
    WithdrawalRequest,
} = models;

const ANALYTICS_TIMEZONE =
    process.env.ANALYTICS_TIMEZONE ||
    process.env.CRON_TIMEZONE ||
    "Asia/Ho_Chi_Minh";
const SEED_PASSWORD = process.env.SEED_PASSWORD || "Seed@123";
const HISTORY_DAYS = 30;
const FUTURE_DAYS = 7;
const DRY_RUN = process.argv.includes("--dry-run");
const VERIFY_MEDIA = process.argv.includes("--verify-media");

// Prefix 7e keeps every ObjectId deterministic and clearly separate from normal records.
const seedId = (scope, index) =>
    new mongoose.Types.ObjectId(
        `7e${scope.toString(16).padStart(2, "0")}${index
            .toString(16)
            .padStart(20, "0")}`
    );
const idList = (scope, count) =>
    Array.from({ length: count }, (_, index) => seedId(scope, index + 1));

const ids = {
    plans: idList(1, 4),
    users: idList(2, 37),
    genres: idList(3, 12),
    artists: idList(4, 8),
    albums: idList(5, 16),
    tracks: idList(6, 48),
    playlists: idList(7, 48),
    listenEvents: idList(8, 9000),
    recentActivities: idList(9, 256),
    interactions: idList(10, 512),
    searchEvents: idList(11, 512),
    subscriptions: idList(12, 32),
    transactions: idList(13, 96),
    notifications: idList(14, 128),
    reports: idList(15, 32),
    releaseSchedules: idList(16, 32),
    artistRequests: idList(17, 8),
    verificationRequests: idList(18, 16),
    trackDailyStats: idList(19, 1024),
    artistDailyStats: idList(20, 256),
    trackMonthlyStats: idList(21, 256),
    artistMonthlyStats: idList(22, 64),
    artistStats: idList(23, 16),
    revenueSummaries: idList(24, 64),
    withdrawals: idList(25, 32),
    personalizedMixes: idList(26, 128),
    refreshTokens: idList(27, 16),
    verificationTokens: idList(28, 16),
};

const PHOTO_IDS = [
    "1511379938547-c1f69419868d",
    "1493225457124-a3eb161ffa5f",
    "1501386761578-eac5c94b800a",
    "1470229722913-7c0e2dbbafd3",
    "1516280440614-37939bbacd81",
    "1524368535928-5b5e00ddc76b",
    "1514525253161-7a46d19cd819",
    "1501612780327-45045538702b",
    "1492684223066-81342ee5ff30",
    "1521337581100-8ca9a73a5f79",
    "1496293455970-f8581aae0e3b",
    "1511671782779-c97d3d27a1d4",
    "1520523839897-bd0b52f945a0",
    "1507838153414-b4b713384a76",
    "1518609878373-06d740f60d8b",
    "1506157786151-b8491531f063",
    "1483412033650-1015ddeb83d1",
    "1524650359799-842906ca1c06",
    "1499364615650-ec38552f4f34",
    "1533174072545-7a4b6ad7a6c3",
    "1500530855697-b586d89ba3ee",
    "1460661419201-fd4cecdf8a8b",
    "1524368535928-5b5e00ddc76b",
    "1459749411175-04bf5292ceea",
];

const PORTRAIT_IDS = [
    "1560250097-0b93528c311a",
    "1500648767791-00dcc994a43e",
    "1494790108377-be9c29b29330",
    "1506794778202-cad84cf45f1d",
    "1534528741775-53994a69daeb",
    "1517841905240-472988babdf9",
    "1531123897727-8f129e1688ce",
    "1527980965255-d3b416303d12",
    "1544005313-94ddf0286df2",
    "1547425260-76bcadfb4f2c",
    "1508214751196-bcfd4ca60f91",
    "1535713875002-d1d0cf377fde",
];

const imageUrl = (photoId, width = 1200, height = 1200) =>
    `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=82`;
const photo = (index, width, height) =>
    imageUrl(PHOTO_IDS[index % PHOTO_IDS.length], width, height);
const portrait = (index) =>
    imageUrl(PORTRAIT_IDS[index % PORTRAIT_IDS.length], 800, 800);
const audioUrl = (index) =>
    `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${
        (index % 16) + 1
    }.mp3`;

const ARTIST_NAMES = [
    "An Nhiên",
    "Minh Kha",
    "The Saigon Tapes",
    "Lam Phương",
    "Kai Đỗ",
    "Mây Trắng",
    "Vũ Lam",
    "Neon Harbor",
];
const ARTIST_FULL_NAMES = [
    "Nguyễn Hoàng An",
    "Trần Minh Kha",
    "Lê Quốc Huy",
    "Phạm Lam Phương",
    "Đỗ Gia Khải",
    "Võ Thanh Mai",
    "Bùi Vũ Lâm",
    "Hoàng Hải Nam",
];
const LISTENER_NAMES = [
    "Nguyễn Minh Anh",
    "Trần Gia Hân",
    "Lê Hoàng Long",
    "Phạm Bảo Ngọc",
    "Võ Quốc Bảo",
    "Đặng Thu Trang",
    "Bùi Hải Đăng",
    "Đỗ Khánh Linh",
    "Hồ Nhật Minh",
    "Ngô Phương Thảo",
    "Dương Tuấn Kiệt",
    "Lý Ngọc Mai",
    "Mai Đức Anh",
    "Trịnh Thanh Hà",
    "Huỳnh Quang Vinh",
    "Phan Yến Nhi",
    "Tạ Anh Khoa",
    "Lương Bích Ngọc",
    "Cao Hoàng Nam",
    "Châu Mỹ Duyên",
    "Vương Minh Trí",
    "Đinh Thảo Vy",
    "Quách Gia Bảo",
    "Tôn Ngọc Hân",
];
const APPLICANT_NAMES = [
    "Đặng Trọng Nhân",
    "Nguyễn Thiên Kim",
    "Trần Hoài Phong",
    "Lê Ánh Dương",
];
const GENRES = [
    ["Seed · Pop Việt", "Giai điệu đại chúng hiện đại, dễ nghe và giàu cảm xúc."],
    ["Seed · Indie", "Âm nhạc độc lập với màu sắc cá nhân rõ nét."],
    ["Seed · Lo-fi", "Không gian nhẹ nhàng dành cho học tập và thư giãn."],
    ["Seed · R&B", "Nhịp điệu mềm mại kết hợp giọng hát giàu cảm xúc."],
    ["Seed · Hip-hop", "Rap, beat và văn hóa đường phố đương đại."],
    ["Seed · Electronic", "Âm thanh điện tử dành cho club và festival."],
    ["Seed · Rock", "Guitar mạnh mẽ, trống sống động và năng lượng cao."],
    ["Seed · Acoustic", "Bản phối mộc, gần gũi và tập trung vào giọng hát."],
    ["Seed · Jazz", "Hòa âm ngẫu hứng và nhịp điệu tinh tế."],
    ["Seed · Classical", "Tác phẩm khí nhạc và giao hưởng chọn lọc."],
    ["Seed · Chill", "Nhạc nền êm dịu cho những khoảnh khắc nghỉ ngơi."],
    ["Seed · Podcast", "Talk show, câu chuyện và nội dung trò chuyện."],
];
const ALBUM_TITLES = [
    "Thành Phố Lúc Bình Minh",
    "Những Ngày Trời Xanh",
    "Sau Cơn Mưa",
    "Chạm Vào Ký Ức",
    "Băng Qua Sài Gòn",
    "Bản Ghi Đêm Hè",
    "Mùa Gió Ngang Qua",
    "Điều Chưa Kịp Nói",
    "Tín Hiệu Từ Xa",
    "Khoảng Trời Riêng",
    "Phía Sau Ánh Đèn",
    "Mây Trôi Về Đâu",
    "Nhịp Thở Thành Phố",
    "Đường Chân Trời",
    "Neon Dreams",
    "After Midnight",
];
const TRACK_TITLES = [
    "Bình Minh Trên Phố",
    "Một Ngày Rất Khác",
    "Thư Gửi Mùa Hè",
    "Màu Của Nỗi Nhớ",
    "Đi Qua Những Cơn Mưa",
    "Ở Lại Cùng Anh",
    "Cà Phê Không Đường",
    "Chuyện Chúng Ta",
    "Ngày Mai Sẽ Khác",
    "Lặng Im Nghe Thành Phố",
    "Mưa Qua Hiên Nhà",
    "Chạm Khẽ",
    "Sài Gòn 2 Giờ Sáng",
    "Qua Khung Cửa Kính",
    "Những Tấm Bưu Thiếp",
    "Radio Cuối Tuần",
    "Đèn Vàng",
    "Bản Ghi Số 7",
    "Có Một Người",
    "Dòng Tin Chưa Gửi",
    "Phút Sau Cùng",
    "Chúng Ta Của Hôm Nay",
    "Mùa Thu Trong Em",
    "Nơi Gió Dừng Chân",
    "Tần Số 98",
    "Vệ Tinh Cô Đơn",
    "Chuyến Tàu Đêm",
    "Khoảng Cách Ánh Sáng",
    "Không Trọng Lực",
    "Tín Hiệu Xanh",
    "Đừng Tắt Ánh Đèn",
    "Nửa Thành Phố",
    "Gọi Tên Bình Yên",
    "Mây Trắng Bay",
    "Một Vòng Hồ Tây",
    "Lời Hẹn Tháng Tư",
    "Chạy Về Phía Mặt Trời",
    "Dưới Tán Cây",
    "Tháng Năm Rực Rỡ",
    "Phía Cuối Con Đường",
    "Neon Heart",
    "Ocean Signal",
    "Midnight Driver",
    "Parallel Lines",
    "Last Summer",
    "Blue Satellite",
    "Afterglow",
    "Home Again",
];
const COUNTRIES = ["Việt Nam", "Singapore", "Nhật Bản", "Hàn Quốc", "Thái Lan"];
const DEVICES = ["Chrome / Windows", "Safari / iPhone", "Reso Android", "Edge / Windows", "Safari / macOS"];
const SOURCES = ["track_detail", "album", "playlist", "search", "artist_profile"];

const dateContext = () => {
    const anchor = dayjs().tz(ANALYTICS_TIMEZONE);
    const day = (offset) => anchor.startOf("day").add(offset, "day");
    const at = (offset, hour = 12, minute = 0) =>
        day(offset).hour(hour).minute(minute).second(0).millisecond(0);
    const key = (offset) => day(offset).format("YYYY-MM-DD");
    const storedDate = (offset) => new Date(`${key(offset)}T00:00:00.000Z`);
    const month = (offset) => anchor.startOf("month").add(offset, "month");

    return { anchor, day, at, key, storedDate, month };
};

const planSnapshot = (plan) => ({
    originalPlanId: plan._id,
    name: plan.name,
    price: plan.price,
    durationDays: plan.durationDays,
    description: plan.description,
    features: plan.features,
    status: plan.status,
});

const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const hashToken = (label) => crypto.createHash("sha512").update(label).digest("hex");

const buildSeedData = async () => {
    const dates = dateContext();
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    const plans = [
        {
            _id: ids.plans[0],
            name: "Seed · Reso Free",
            price: 0,
            durationDays: 30,
            description: "Gói miễn phí có quảng cáo, phù hợp để test tài khoản cơ bản.",
            features: [],
            status: "active",
        },
        {
            _id: ids.plans[1],
            name: "Seed · Reso Premium Monthly",
            price: 59000,
            durationDays: 30,
            description: "Premium theo tháng với chất lượng cao và nghe ngoại tuyến.",
            features: ["NO_ADS", "HIGH_QUALITY_AUDIO", "UNLIMITED_SKIP", "OFFLINE_DOWNLOAD", "BACKGROUND_PLAY", "AI_SMART_PLAYLIST"],
            status: "active",
        },
        {
            _id: ids.plans[2],
            name: "Seed · Reso HiFi Monthly",
            price: 99000,
            durationDays: 30,
            description: "Gói HiFi dùng để test lossless và toàn bộ tính năng nâng cao.",
            features: ["NO_ADS", "HIGH_QUALITY_AUDIO", "LOSSLESS_AUDIO", "UNLIMITED_SKIP", "OFFLINE_DOWNLOAD", "BACKGROUND_PLAY", "AI_SMART_PLAYLIST", "ADVANCED_RECOMMENDATION", "EARLY_ACCESS", "EXCLUSIVE_CONTENT"],
            status: "active",
        },
        {
            _id: ids.plans[3],
            name: "Seed · Reso Student",
            price: 29000,
            durationDays: 30,
            description: "Gói sinh viên đang tạm ngừng để test trạng thái inactive.",
            features: ["NO_ADS", "HIGH_QUALITY_AUDIO", "UNLIMITED_SKIP", "BACKGROUND_PLAY"],
            status: "inactive",
        },
    ];

    const users = [
        {
            _id: ids.users[0],
            email: "admin@reso.seed",
            password: passwordHash,
            authProvider: "local",
            avatar: portrait(0),
            role: "admin",
            activeStatus: "active",
            emailVerified: true,
            profile: { fullName: "Reso Seed Admin", gender: "other", dateOfBirth: new Date("1992-04-12"), country: "Việt Nam" },
            settings: { language: "vi", notificationsEnabled: true, shufflePlayDefault: false },
            stats: { totalListeningTime: 0, totalTracksPlayed: 0 },
        },
        ...ARTIST_FULL_NAMES.map((fullName, index) => ({
            _id: ids.users[index + 1],
            email: `artist${String(index + 1).padStart(2, "0")}@reso.seed`,
            password: passwordHash,
            authProvider: "local",
            avatar: portrait(index + 1),
            role: "artist",
            activeStatus: index === 7 ? "inactive" : "active",
            emailVerified: true,
            profile: {
                fullName,
                gender: ["male", "female", "other"][index % 3],
                dateOfBirth: new Date(`${1992 + index}-0${(index % 8) + 1}-15`),
                country: COUNTRIES[index % 2],
            },
            settings: { language: index % 4 === 0 ? "en" : "vi", notificationsEnabled: true, shufflePlayDefault: index % 2 === 0 },
            stats: { totalListeningTime: 0, totalTracksPlayed: 0 },
        })),
        ...LISTENER_NAMES.map((fullName, index) => {
            const premium = index < 16;
            const plan = plans[index % 3 === 0 ? 2 : 1];
            return {
                _id: ids.users[index + 9],
                email: `listener${String(index + 1).padStart(2, "0")}@reso.seed`,
                password: passwordHash,
                authProvider: "local",
                avatar: portrait(index + 4),
                role: "user",
                activeStatus: index === 22 ? "blocked" : index === 23 ? "inactive" : "active",
                blockReason: index === 22 ? "Tài khoản mẫu bị khóa để test luồng quản trị." : "",
                emailVerified: index !== 21,
                profile: {
                    fullName,
                    gender: ["female", "male", "prefer_not_to_say", "other"][index % 4],
                    dateOfBirth: new Date(`${1996 + (index % 9)}-${String((index % 12) + 1).padStart(2, "0")}-12`),
                    country: COUNTRIES[index % COUNTRIES.length],
                },
                settings: { language: index % 5 === 0 ? "en" : "vi", notificationsEnabled: index % 7 !== 0, shufflePlayDefault: index % 2 === 0 },
                subscription: premium
                    ? { isPremium: true, currentPlanId: plan._id, premiumEndDate: dates.at(20 + index).toDate() }
                    : { isPremium: false },
                stats: { totalListeningTime: 0, totalTracksPlayed: 0 },
            };
        }),
        ...APPLICANT_NAMES.map((fullName, index) => ({
            _id: ids.users[index + 33],
            email: `applicant${String(index + 1).padStart(2, "0")}@reso.seed`,
            password: passwordHash,
            authProvider: "local",
            avatar: portrait(index + 8),
            role: "user",
            activeStatus: "active",
            emailVerified: true,
            profile: { fullName, gender: index % 2 ? "female" : "male", dateOfBirth: new Date(`${1998 + index}-06-18`), country: "Việt Nam" },
            settings: { language: "vi", notificationsEnabled: true, shufflePlayDefault: false },
            stats: { totalListeningTime: 0, totalTracksPlayed: 0 },
        })),
    ];

    const artistUsers = users.slice(1, 9);
    const listeners = users.slice(9, 33);
    const applicants = users.slice(33, 37);
    const listeningUsers = [...artistUsers, ...listeners];

    const genres = GENRES.map(([name, description], index) => ({
        _id: ids.genres[index],
        name,
        description,
        image: photo(index + 2, 1200, 800),
        isActive: index !== 11,
    }));

    const artists = ARTIST_NAMES.map((name, index) => ({
        _id: ids.artists[index],
        userId: artistUsers[index]._id,
        name,
        bio: `${name} là nghệ sĩ độc lập trong bộ dữ liệu kiểm thử Reso, phát hành nhiều màu sắc từ pop, indie đến electronic.`,
        avatar: portrait(index + 2),
        coverImage: photo(index + 5, 1600, 700),
        socialLinks: {
            facebook: `https://www.facebook.com/reso.seed.artist.${index + 1}`,
            instagram: `https://www.instagram.com/reso_seed_artist_${index + 1}`,
            youtube: `https://www.youtube.com/@reso-seed-artist-${index + 1}`,
        },
        stats: { followers: 0, totalStreams: 0, monthlyListeners: 0 },
        revenue: {
            totalEarnedAmount: 0,
            totalWithdrawnAmount: 0,
            availableAmount: 0,
            pendingPayoutAmount: 0,
            confirmedRevenueSummaryIds: [],
        },
        payoutAccounts: [
            {
                bankName: ["Vietcombank", "Techcombank", "MB Bank", "ACB"][index % 4],
                accountNumber: `001100${String(100000 + index)}`,
                accountHolderName: ARTIST_FULL_NAMES[index].toUpperCase(),
                isDefault: true,
            },
        ],
        activeStatus: index === 7 ? "inactive" : "active",
    }));

    const albums = ALBUM_TITLES.map((title, index) => ({
        _id: ids.albums[index],
        title,
        artistId: artists[Math.floor(index / 2)]._id,
        coverImage: photo(index + 3, 1200, 1200),
        trackList: [],
        releaseDate: dates.at(-180 + index * 9).toDate(),
        status: index === 13 ? "draft" : index === 14 ? "hidden" : index === 15 ? "blocked" : "active",
        blockedReason: index === 15 ? "Album mẫu bị chặn để test moderation." : "",
        previousStatusBeforeAdminBlock: index === 15 ? "active" : null,
        totalDuration: 0,
    }));

    const durations = [372, 356, 401, 338, 385, 364, 420, 347];
    const tracks = TRACK_TITLES.map((title, index) => {
        const artistIndex = Math.floor(index / 6);
        const albumIndex = artistIndex * 2 + Math.floor((index % 6) / 3);
        let activeStatus = "active";
        let approvalStatus = "approved";
        if (index === 40) approvalStatus = "pending";
        if (index === 41) { activeStatus = "draft"; approvalStatus = "draft"; }
        if (index === 42 || index === 46) activeStatus = "hidden";
        if (index === 43) { activeStatus = "blocked"; approvalStatus = "rejected"; }
        if (index === 44) { activeStatus = "draft"; approvalStatus = "pending"; }
        if (index === 45) approvalStatus = "rejected";
        if (index === 47) activeStatus = "blocked";
        const duration = durations[index % durations.length];

        return {
            _id: ids.tracks[index],
            title,
            artist_artistId: artists[artistIndex]._id,
            album_albumId: albums[albumIndex]._id,
            genreIds: [ids.genres[(artistIndex + index) % 11], ids.genres[(artistIndex * 2 + index + 3) % 11]],
            audioFiles: [
                { url: audioUrl(index), format: "mp3", bitrate: 320, label: "original", priority: 1 },
                { url: audioUrl(index), format: "mp3", bitrate: 128, label: "medium", priority: 2 },
            ],
            duration,
            avatar: photo(index + 7, 900, 900),
            coverImage: [photo(index + 7, 1200, 1200), photo(index + 8, 1600, 900)],
            lyricsStatic: `Verse 1\n${title}, vang lên giữa thành phố.\nTừng nhịp tim đưa ta về gần nhau.\n\nChorus\nGiữ lấy khoảnh khắc này, đừng để ngày trôi mau.`,
            lyricsSyncUrl: "",
            stats: { totalLike: 0, totalPlay: 0 },
            releaseDate: dates.at(-150 + index * 3).toDate(),
            activeStatus,
            approvalStatus,
            copyright: {
                copyrightOwner: `${ARTIST_NAMES[artistIndex]} Publishing`,
                recordingOwner: "Reso Seed Records",
                composer: ARTIST_FULL_NAMES[artistIndex],
                lyricist: ARTIST_FULL_NAMES[artistIndex],
                producer: `${ARTIST_NAMES[artistIndex]} Studio`,
                isOriginal: index % 9 !== 0,
                isCover: index % 9 === 0,
                isRemix: index % 13 === 0,
                usesSample: index % 11 === 0,
                usesLicensedBeat: index % 7 === 0,
                originalTrackTitle: index % 9 === 0 ? `Original demo ${index + 1}` : "",
                originalArtistName: index % 9 === 0 ? "Public Domain Ensemble" : "",
                licenseDocumentUrls: [photo(20 + index, 1400, 900)],
                declarationAccepted: true,
                copyrightStatus: approvalStatus === "rejected" ? "rejected" : index % 11 === 0 ? "disputed" : "verified",
                copyrightNote: index % 11 === 0 ? "Bản mẫu có gắn cờ để test quy trình tranh chấp." : "Hồ sơ bản quyền mẫu đã được xác nhận.",
            },
            moderation: {
                submittedAt: dates.at(-155 + index * 3).toDate(),
                reviewedBy: ids.users[0],
                reviewedAt: approvalStatus === "draft" || approvalStatus === "pending" ? null : dates.at(-151 + index * 3).toDate(),
                adminNote: approvalStatus === "rejected" ? "Metadata mẫu chưa đạt yêu cầu." : "Nội dung seed đã được duyệt.",
                violationFlags: approvalStatus === "rejected" ? ["wrong_metadata"] : [],
            },
            rejectReason: approvalStatus === "rejected" ? "Thông tin bản quyền chưa đầy đủ." : "",
            hiddenReason: activeStatus === "hidden" ? "Nghệ sĩ tạm ẩn bản phát hành mẫu." : "",
            hiddenAt: activeStatus === "hidden" ? dates.at(-3).toDate() : null,
            blockedReason: activeStatus === "blocked" ? "Nội dung mẫu bị chặn để test quản trị." : "",
        };
    });

    albums.forEach((album, albumIndex) => {
        const albumTracks = tracks.filter((track) => String(track.album_albumId) === String(album._id));
        album.trackList = albumTracks.map((track, index) => ({ trackId: track._id, order: index + 1 }));
        album.totalDuration = albumTracks.reduce((sum, track) => sum + track.duration, 0);
    });

    const playableTracks = tracks.filter(
        (track) => track.activeStatus === "active" && track.approvalStatus === "approved"
    );
    const listenEvents = [];
    const eventBuckets = new Map();
    const userListeningTotals = new Map();
    let listenEventIndex = 0;

    for (let dayOffset = -(HISTORY_DAYS - 1); dayOffset <= FUTURE_DAYS; dayOffset += 1) {
        const dateKey = dates.key(dayOffset);
        const dayEvents = [];

        listeningUsers.forEach((user, userIndex) => {
            const eventCount = 4 + ((userIndex + dayOffset + HISTORY_DAYS) % 5);

            for (let order = 1; order <= eventCount; order += 1) {
                const track = playableTracks[
                    (userIndex * 7 + (dayOffset + HISTORY_DAYS) * 3 + order * 5) % playableTracks.length
                ];
                const requiredPercent = order <= 3 ? 80 : 30;
                const isValidStream = (userIndex + order + dayOffset + 50) % 11 !== 0;
                const listenPercent = isValidStream
                    ? Math.min(100, requiredPercent + 8 + ((userIndex * 3 + order * 7) % 19))
                    : 8 + ((userIndex + order * 4) % Math.max(requiredPercent - 8, 1));
                const listenedDuration = round(track.duration * (listenPercent / 100));
                const listenedAt = dates
                    .at(
                        dayOffset,
                        6 + ((userIndex * 3 + order * 2 + dayOffset + 40) % 17),
                        (userIndex * 11 + order * 7) % 60
                    )
                    .toDate();
                const event = {
                    _id: ids.listenEvents[listenEventIndex],
                    userId: user._id,
                    trackId: track._id,
                    artistId: track.artist_artistId,
                    listenedAt,
                    trackDuration: track.duration,
                    listenedDuration,
                    listenPercent,
                    dailyListenOrder: order,
                    requiredPercent,
                    source: SOURCES[(userIndex + order) % SOURCES.length],
                    isValidStream,
                    duration: listenedDuration,
                    completed: listenPercent >= 90,
                    skipped: !isValidStream && listenPercent < 30,
                    device: DEVICES[(userIndex + order) % DEVICES.length],
                    country: user.profile.country,
                    createdAt: listenedAt,
                    updatedAt: listenedAt,
                };

                if (!event._id) {
                    throw new Error("ListenEvent seed exceeded the reserved deterministic ID range.");
                }

                listenEvents.push(event);
                dayEvents.push(event);
                listenEventIndex += 1;

                if (dayOffset <= 0) {
                    const current = userListeningTotals.get(String(user._id)) || {
                        duration: 0,
                        plays: 0,
                    };
                    current.duration += listenedDuration;
                    current.plays += isValidStream ? 1 : 0;
                    userListeningTotals.set(String(user._id), current);
                }
            }
        });

        eventBuckets.set(dateKey, dayEvents);
    }

    users.forEach((user) => {
        const totals = userListeningTotals.get(String(user._id));
        if (totals) {
            user.stats.totalListeningTime = Math.round(totals.duration);
            user.stats.totalTracksPlayed = totals.plays;
        }
    });

    const interactions = [];
    let interactionIndex = 0;
    listeners.forEach((user, userIndex) => {
        for (let index = 0; index < 8; index += 1) {
            const track = playableTracks[(userIndex * 3 + index * 5) % playableTracks.length];
            interactions.push({
                _id: ids.interactions[interactionIndex++],
                userId: user._id,
                targetType: "Track",
                targetId: track._id,
                action: "like",
                createdAt: dates.at(-((userIndex + index) % 20), 19, index * 3).toDate(),
            });
        }
        for (let index = 0; index < 3; index += 1) {
            const artist = artists[(userIndex + index * 3) % artists.length];
            interactions.push({
                _id: ids.interactions[interactionIndex++],
                userId: user._id,
                targetType: "Artist",
                targetId: artist._id,
                action: "follow",
                createdAt: dates.at(-((userIndex + index + 2) % 25), 9, index * 5).toDate(),
            });
        }
        for (let index = 0; index < 2; index += 1) {
            const album = albums[(userIndex * 2 + index * 5) % 13];
            interactions.push({
                _id: ids.interactions[interactionIndex++],
                userId: user._id,
                targetType: "Album",
                targetId: album._id,
                action: "follow",
                createdAt: dates.at(-((userIndex + index + 4) % 18), 10, index * 7).toDate(),
            });
        }
    });

    const validPastEvents = listenEvents.filter(
        (event) => event.isValidStream && dayjs(event.listenedAt).isBefore(dates.day(1))
    );
    const playCountByTrack = new Map();
    const listenerSetsByArtist = new Map();
    validPastEvents.forEach((event) => {
        const trackKey = String(event.trackId);
        const artistKey = String(event.artistId);
        playCountByTrack.set(trackKey, (playCountByTrack.get(trackKey) || 0) + 1);
        if (!listenerSetsByArtist.has(artistKey)) listenerSetsByArtist.set(artistKey, new Set());
        listenerSetsByArtist.get(artistKey).add(String(event.userId));
    });
    const likesByTrack = new Map();
    const followersByArtist = new Map();
    interactions.forEach((interaction) => {
        const targetKey = String(interaction.targetId);
        if (interaction.targetType === "Track") {
            likesByTrack.set(targetKey, (likesByTrack.get(targetKey) || 0) + 1);
        }
        if (interaction.targetType === "Artist") {
            followersByArtist.set(targetKey, (followersByArtist.get(targetKey) || 0) + 1);
        }
    });
    tracks.forEach((track, index) => {
        track.stats.totalPlay = (playCountByTrack.get(String(track._id)) || 0) + 1200 + index * 137;
        track.stats.totalLike = (likesByTrack.get(String(track._id)) || 0) + 80 + index * 11;
    });
    artists.forEach((artist, index) => {
        const artistEvents = validPastEvents.filter(
            (event) => String(event.artistId) === String(artist._id)
        );
        artist.stats.followers = (followersByArtist.get(String(artist._id)) || 0) + 900 + index * 620;
        artist.stats.totalStreams = artistEvents.length + 18000 + index * 7400;
        artist.stats.monthlyListeners = (listenerSetsByArtist.get(String(artist._id))?.size || 0) + 1200 + index * 310;
    });

    const playlists = [];
    let playlistIndex = 0;
    listeners.forEach((user, userIndex) => {
        [
            ["Yêu thích mỗi ngày", "Những ca khúc thường nghe nhất trong ngày.", "user", true],
            ["Chill sau giờ làm", "Nhạc nhẹ cho buổi tối và cuối tuần.", "user", userIndex % 3 !== 0],
        ].forEach(([title, description, type, isPublic], localIndex) => {
            const selected = Array.from({ length: 12 }, (_, index) =>
                playableTracks[(userIndex * 5 + localIndex * 7 + index * 3) % playableTracks.length]
            );
            playlists.push({
                _id: ids.playlists[playlistIndex],
                userId: user._id,
                title: `${title} #${String(userIndex + 1).padStart(2, "0")}`,
                description,
                type,
                coverImage: photo(userIndex * 2 + localIndex + 10, 1000, 1000),
                isPublic,
                isHidden: userIndex === 22 && localIndex === 1,
                trackCount: selected.length,
                totalDuration: selected.reduce((sum, track) => sum + track.duration, 0),
                tracks: selected.map((track, index) => ({
                    trackId: track._id,
                    order: index,
                    addedAt: dates.at(-15 + index).toDate(),
                })),
            });
            playlistIndex += 1;
        });
    });

    const recentActivities = [];
    let recentIndex = 0;
    listeners.forEach((user, userIndex) => {
        for (let index = 0; index < 8; index += 1) {
            const track = playableTracks[(userIndex * 4 + index * 3) % playableTracks.length];
            const artist = artists.find((item) => String(item._id) === String(track.artist_artistId));
            const album = albums.find((item) => String(item._id) === String(track.album_albumId));
            const listenPercent = 55 + ((userIndex + index * 7) % 46);
            recentActivities.push({
                _id: ids.recentActivities[recentIndex++],
                userId: user._id,
                trackId: track._id,
                artistId: artist._id,
                albumId: album._id,
                trackTitle: track.title,
                trackImage: track.avatar,
                artistName: artist.name,
                artistAvatar: artist.avatar,
                albumTitle: album.title,
                albumCoverImage: album.coverImage,
                trackDuration: track.duration,
                listenedDuration: round(track.duration * (listenPercent / 100)),
                listenPercent,
                listenedAt: dates.at(-(index % 5), 21 - (index % 6), (userIndex * 7 + index) % 60).toDate(),
                source: SOURCES[(userIndex + index) % SOURCES.length],
            });
        }
    });

    const searchKeywords = [
        "nhạc chill", "An Nhiên", "Sài Gòn", "mưa", "indie việt", "lofi học bài",
        "Neon Harbor", "acoustic", "nhạc mới", "tình yêu", "electronic", "playlist buổi tối",
    ];
    const searchEvents = [];
    let searchIndex = 0;
    listeners.forEach((user, userIndex) => {
        searchKeywords.forEach((keyword, index) => {
            searchEvents.push({
                _id: ids.searchEvents[searchIndex++],
                userId: user._id,
                keyword,
                clickedTrackId: index % 4 === 0
                    ? null
                    : playableTracks[(userIndex * 2 + index * 5) % playableTracks.length]._id,
                createdAt: dates.at(-((userIndex + index) % 28), 8 + (index % 13), (index * 4) % 60).toDate(),
            });
        });
    });

    const subscriptions = [];
    listeners.forEach((user, index) => {
        const isActive = index < 16;
        const plan = isActive ? plans[index % 3 === 0 ? 2 : 1] : plans[1];
        const status = isActive ? "active" : ["expired", "cancelled", "pending"][index % 3];
        const startDate = dates.at(isActive ? -12 - index : -70 - index).toDate();
        const endDate = status === "active"
            ? user.subscription.premiumEndDate
            : status === "pending"
                ? null
                : dates.at(-25 - index).toDate();
        subscriptions.push({
            _id: ids.subscriptions[index],
            userId: user._id,
            planId: plan._id,
            planSnapshot: planSnapshot(plan),
            status,
            startDate: status === "pending" ? null : startDate,
            endDate,
            autoRenew: isActive && index % 3 !== 0,
            createdAt: startDate,
            updatedAt: startDate,
        });
    });

    const transactions = [];
    let transactionIndex = 0;
    subscriptions.forEach((subscription, index) => {
        const plan = plans.find((item) => String(item._id) === String(subscription.planId));
        const methods = ["vnpay", "momo", "card"];
        for (let localIndex = 0; localIndex < 2; localIndex += 1) {
            const paymentMethod = methods[(index + localIndex) % methods.length];
            const status = localIndex === 0
                ? (subscription.status === "pending" ? "pending" : "success")
                : ["success", "failed", "refunded", "success"][index % 4];
            const paidAt = dates.at(-((index * 5 + localIndex * 19) % 82), 10 + (index % 9), 15).toDate();
            transactions.push({
                _id: ids.transactions[transactionIndex],
                userId: subscription.userId,
                subscriptionId: subscription._id,
                planId: plan._id,
                amount: plan.price,
                tax: 0,
                totalAmount: plan.price,
                currency: "VND",
                paymentMethod,
                paymentGateway: paymentMethod === "card" ? "stripe" : paymentMethod,
                gatewayTransactionId: `SEED-${dates.anchor.format("YYYYMM")}-${String(transactionIndex + 1).padStart(5, "0")}`,
                status,
                paidAt: ["success", "refunded"].includes(status) ? paidAt : null,
                failedAt: status === "failed" ? paidAt : null,
                failureReason: status === "failed" ? "Giao dịch mẫu bị từ chối bởi ngân hàng." : "",
                invoiceNumber: status === "success" ? `RESO-SEED-${String(transactionIndex + 1).padStart(6, "0")}` : "",
                createdAt: paidAt,
                updatedAt: paidAt,
            });
            transactionIndex += 1;
        }
    });

    const artistRequests = applicants.map((user, index) => {
        const status = ["pending", "approved", "rejected", "pending"][index];
        return {
            _id: ids.artistRequests[index],
            userId: user._id,
            stageName: ["Nắng Mới", "Kim Vân", "Phong Trần", "Solar Dương"][index],
            bio: "Hồ sơ nghệ sĩ giả lập có đủ thông tin để kiểm thử luồng xét duyệt.",
            avatar: portrait(index + 6),
            genres: [GENRES[index][0], GENRES[index + 2][0]],
            socialLinks: {
                youtube: `https://www.youtube.com/@reso-seed-applicant-${index + 1}`,
                instagram: `https://www.instagram.com/reso_seed_applicant_${index + 1}`,
                website: `https://example.com/reso-seed-applicant-${index + 1}`,
            },
            identityInfo: {
                idNumber: `07920${String(100000 + index)}`,
                fullName: user.profile.fullName,
                dateOfBirth: user.profile.dateOfBirth,
                frontImage: photo(18 + index, 1400, 900),
                backImage: photo(19 + index, 1400, 900),
            },
            portfolio: {
                demoTrackUrls: [audioUrl(index + 10)],
                musicLinks: [`https://soundcloud.com/reso-seed-applicant-${index + 1}`],
                description: "Demo portfolio dùng riêng cho môi trường phát triển.",
            },
            artistDeclaration: {
                acceptedTerms: true,
                copyrightCommitment: true,
                truthfulInformationCommitment: true,
                acceptedAt: dates.at(-10 - index).toDate(),
            },
            review: {
                adminNote: status === "rejected" ? "Ảnh giấy tờ chưa rõ, yêu cầu gửi lại." : "Hồ sơ mẫu đã được kiểm tra.",
                checklist: {
                    profileComplete: true,
                    identityVerified: status !== "pending",
                    hasMusicActivity: true,
                    socialLinksValid: true,
                    noImpersonation: true,
                    acceptedCopyrightPolicy: true,
                },
            },
            status,
            reviewedBy: status === "pending" ? null : ids.users[0],
            reviewedAt: status === "pending" ? null : dates.at(-4 - index).toDate(),
            rejectReason: status === "rejected" ? "Cần bổ sung giấy tờ định danh rõ nét hơn." : "",
        };
    });

    const verificationRequests = artists.map((artist, index) => ({
        _id: ids.verificationRequests[index],
        artistId: artist._id,
        userId: artist.userId,
        status: index % 3 === 0 ? "open" : "closed",
        note: index % 3 === 0
            ? "Yêu cầu xác minh mẫu đang chờ xử lý."
            : "Hồ sơ mẫu đã được đối chiếu và đóng.",
    }));

    const releaseSchedules = [];
    for (let index = 0; index < 24; index += 1) {
        const isTrack = index % 3 !== 0;
        const target = isTrack ? tracks[(index * 5) % tracks.length] : albums[(index * 3) % albums.length];
        const artistId = isTrack ? target.artist_artistId : target.artistId;
        const state = index < 12 ? "scheduled" : index < 20 ? "released" : "cancelled";
        const scheduledAt = state === "scheduled"
            ? dates.at(1 + (index % 14), 9 + (index % 8), 0).toDate()
            : dates.at(-2 - index, 9 + (index % 8), 0).toDate();
        releaseSchedules.push({
            _id: ids.releaseSchedules[index],
            type: isTrack ? "track" : "album",
            targetId: target._id,
            artistId,
            scheduledAt,
            releasedAt: state === "released" ? scheduledAt : null,
            status: state,
        });
    }

    const reportReasons = ["Nghi ngờ vi phạm bản quyền", "Metadata không chính xác", "Nội dung không phù hợp", "Giả mạo nghệ sĩ"];
    const reports = Array.from({ length: 24 }, (_, index) => {
        const targetType = ["track", "album", "artist"][index % 3];
        const target = targetType === "track"
            ? tracks[(index * 3) % tracks.length]
            : targetType === "album"
                ? albums[(index * 2) % albums.length]
                : artists[index % artists.length];
        const status = ["pending", "reviewing", "resolved", "rejected"][index % 4];
        return {
            _id: ids.reports[index],
            userId: listeners[index % listeners.length]._id,
            targetId: target._id,
            targetType,
            reason: reportReasons[index % reportReasons.length],
            description: `Báo cáo mẫu #${index + 1} có mô tả và ảnh minh chứng để test trang quản trị.`,
            images: index % 2 === 0 ? [photo(index + 12, 1200, 800)] : [],
            status,
            handledBy: ["resolved", "rejected"].includes(status) ? ids.users[0] : null,
            handledAt: ["resolved", "rejected"].includes(status) ? dates.at(-2 - (index % 10)).toDate() : null,
            resolution: status === "resolved" ? ["warning", "remove_content"][index % 2] : status === "rejected" ? "ignore" : "",
            resolutionNote: status === "resolved" ? "Đã xử lý báo cáo mẫu theo quy trình kiểm duyệt." : "",
        };
    });

    const notificationTypes = ["system", "new_release", "artist_update", "payment", "follow", "report", "subscription"];
    const notifications = Array.from({ length: 96 }, (_, index) => {
        const global = index % 12 === 0;
        const group = !global && index % 10 === 0;
        const user = listeners[index % listeners.length];
        const track = playableTracks[index % playableTracks.length];
        return {
            _id: ids.notifications[index],
            userId: global || group ? null : user._id,
            type: notificationTypes[index % notificationTypes.length],
            title: global ? "Thông báo bảo trì hệ thống" : `Thông báo kiểm thử #${index + 1}`,
            content: global
                ? "Reso sẽ bảo trì ngắn trong môi trường thử nghiệm."
                : `${track.title} vừa có cập nhật mới trong bộ dữ liệu seed.`,
            isRead: !global && !group && index % 3 === 0,
            actorId: index % 2 === 0 ? ids.users[0] : track.artist_artistId,
            actorType: index % 2 === 0 ? "admin" : "artist",
            artistId: track.artist_artistId,
            targetId: track._id,
            targetType: "track",
            targetName: track.title,
            thumbnail: track.avatar,
            sourceType: index % 2 === 0 ? "admin_manual" : "artist_auto",
            relatedTrackId: track._id,
            receiverType: global ? "all" : group ? "group" : "single",
            isGlobal: global,
            targetRoles: group ? [index % 20 === 0 ? "artist" : "user"] : [],
            readBy: global ? listeners.slice(0, index % 8).map((item) => item._id) : [],
            deletedBy: [],
            createdBy: ids.users[0],
            isDeleted: index === 95,
            deletedAt: index === 95 ? dates.at(-1).toDate() : null,
            createdAt: dates.at(-(index % 29), 7 + (index % 15), index % 60).toDate(),
        };
    });

    const trackDailyStats = [];
    const artistDailyStats = [];
    const trackDailyRankings = [];
    const artistRankings = [];
    let trackDailyStatIndex = 0;
    let artistDailyStatIndex = 0;

    for (let dayOffset = -13; dayOffset <= 0; dayOffset += 1) {
        const dateKey = dates.key(dayOffset);
        const storedDate = dates.storedDate(dayOffset);
        const dayEvents = eventBuckets.get(dateKey) || [];
        const trackGroups = new Map();
        const artistGroups = new Map();

        dayEvents.forEach((event) => {
            const trackKey = String(event.trackId);
            const artistKey = String(event.artistId);
            if (!trackGroups.has(trackKey)) {
                trackGroups.set(trackKey, { trackId: event.trackId, events: [] });
            }
            if (!artistGroups.has(artistKey)) {
                artistGroups.set(artistKey, { artistId: event.artistId, events: [] });
            }
            trackGroups.get(trackKey).events.push(event);
            artistGroups.get(artistKey).events.push(event);
        });

        const dailyTrackDocuments = [...trackGroups.values()].map(({ trackId, events }) => {
            const valid = events.filter((event) => event.isValidStream);
            return {
                _id: ids.trackDailyStats[trackDailyStatIndex++],
                trackId,
                dateKey,
                date: storedDate,
                playCount: valid.length,
                uniqueListeners: new Set(valid.map((event) => String(event.userId))).size,
                averageListenDuration: valid.length
                    ? round(valid.reduce((sum, event) => sum + event.duration, 0) / valid.length)
                    : 0,
                skipCount: events.filter((event) => event.skipped).length,
            };
        });
        trackDailyStats.push(...dailyTrackDocuments);
        trackDailyRankings.push({
            dateKey,
            date: storedDate,
            rankings: [...dailyTrackDocuments]
                .filter((item) => item.playCount > 0)
                .sort((left, right) => right.playCount - left.playCount || right.uniqueListeners - left.uniqueListeners)
                .slice(0, 100)
                .map((item, index) => {
                    const previousRank = dayOffset === -13 ? null : ((index + dayOffset + 30) % dailyTrackDocuments.length) + 1;
                    const rank = index + 1;
                    const rankChange = previousRank ? previousRank - rank : 0;
                    return {
                        trackId: item.trackId,
                        playCount: item.playCount,
                        uniqueListeners: item.uniqueListeners,
                        averageListenDuration: item.averageListenDuration,
                        skipCount: item.skipCount,
                        rank,
                        previousRank,
                        rankChange,
                        rankTrend: previousRank === null ? "new" : rankChange > 0 ? "up" : rankChange < 0 ? "down" : "same",
                    };
                }),
        });

        const dailyArtistDocuments = [...artistGroups.values()].map(({ artistId, events }) => {
            const valid = events.filter((event) => event.isValidStream);
            return {
                _id: ids.artistDailyStats[artistDailyStatIndex++],
                artistId,
                dateKey,
                date: storedDate,
                streamCount: valid.length,
                uniqueListeners: new Set(valid.map((event) => String(event.userId))).size,
            };
        });
        artistDailyStats.push(...dailyArtistDocuments);
        artistRankings.push({
            periodType: "daily",
            dateKey,
            date: storedDate,
            rankings: [...dailyArtistDocuments]
                .sort((left, right) => right.streamCount - left.streamCount || right.uniqueListeners - left.uniqueListeners)
                .slice(0, 20)
                .map((item, index) => {
                    const artistDayEvents = artistGroups.get(String(item.artistId))?.events || [];
                    const completed = artistDayEvents.filter((event) => event.completed && event.isValidStream).length;
                    return {
                        artistId: item.artistId,
                        playCount: item.streamCount,
                        uniqueListeners: item.uniqueListeners,
                        completedPlayCount: completed,
                        totalTracksPlayed: new Set(artistDayEvents.map((event) => String(event.trackId))).size,
                        score: round(item.streamCount + item.uniqueListeners * 2 + completed * 0.5),
                        rank: index + 1,
                    };
                }),
        });
    }

    const trackMonthlyStats = [];
    const artistMonthlyStats = [];
    const trackMonthlyRankings = [];
    let trackMonthlyIndex = 0;
    let artistMonthlyIndex = 0;
    for (let monthOffset = -2; monthOffset <= 0; monthOffset += 1) {
        const month = dates.month(monthOffset);
        const year = month.year();
        const monthNumber = month.month() + 1;
        const monthlyTrackDocuments = tracks.map((track, index) => {
            const playCount = Math.max(20, 4300 + index * 173 + (monthOffset + 2) * 850 - (index % 5) * 230);
            const uniqueListeners = Math.max(10, Math.round(playCount * (0.42 + (index % 4) * 0.06)));
            const eligibleStreams = Math.round(playCount * 0.91);
            const revenueAmount = Math.round(eligibleStreams * 18.7);
            return {
                _id: ids.trackMonthlyStats[trackMonthlyIndex++],
                trackId: track._id,
                year,
                month: monthNumber,
                playCount,
                uniqueListeners,
                revenue: {
                    eligibleStreams,
                    revenueAmount,
                    artistRevenueAmount: Math.round(revenueAmount * 0.7),
                    calculatedAt: monthOffset < 0 ? month.endOf("month").toDate() : dates.anchor.toDate(),
                },
            };
        });
        trackMonthlyStats.push(...monthlyTrackDocuments);
        trackMonthlyRankings.push({
            year,
            month: monthNumber,
            rankings: [...monthlyTrackDocuments]
                .sort((left, right) => right.playCount - left.playCount || right.uniqueListeners - left.uniqueListeners)
                .map((item, index) => ({
                    trackId: item.trackId,
                    playCount: item.playCount,
                    uniqueListeners: item.uniqueListeners,
                    rank: index + 1,
                })),
        });

        const monthlyArtistDocuments = artists.map((artist, index) => {
            const artistTracks = monthlyTrackDocuments.filter((item) => {
                const track = tracks.find((candidate) => String(candidate._id) === String(item.trackId));
                return String(track.artist_artistId) === String(artist._id);
            });
            return {
                _id: ids.artistMonthlyStats[artistMonthlyIndex++],
                artistId: artist._id,
                year,
                month: monthNumber,
                newFollowers: 90 + index * 24 + (monthOffset + 2) * 15,
                totalFollowers: artist.stats.followers - Math.abs(monthOffset) * (110 + index * 12),
                totalStreams: artistTracks.reduce((sum, item) => sum + item.playCount, 0),
                revenueAmount: artistTracks.reduce((sum, item) => sum + item.revenue.artistRevenueAmount, 0),
            };
        });
        artistMonthlyStats.push(...monthlyArtistDocuments);
        artistRankings.push({
            periodType: "monthly",
            year,
            month: monthNumber,
            rankings: [...monthlyArtistDocuments]
                .sort((left, right) => right.totalStreams - left.totalStreams)
                .map((item, index) => ({
                    artistId: item.artistId,
                    playCount: item.totalStreams,
                    uniqueListeners: 2800 + index * 390,
                    completedPlayCount: Math.round(item.totalStreams * 0.68),
                    totalTracksPlayed: 6,
                    score: round(item.totalStreams * 1.25 + item.newFollowers * 4),
                    rank: index + 1,
                })),
        });
    }

    const artistStats = artists.map((artist, index) => ({
        _id: ids.artistStats[index],
        artistId: artist._id,
        totalStreams: artist.stats.totalStreams,
        totalFollowers: artist.stats.followers,
        monthlyListeners: artist.stats.monthlyListeners,
        demographics: {
            ageGroups: { "13-17": 6 + index, "18-24": 38 - index, "25-34": 34 + index, "35-44": 15, "45+": 7 },
            gender: { male: 45 + (index % 4), female: 48 - (index % 3), other: 7 },
            countries: { "Việt Nam": 72 - index, Singapore: 8 + index, "Nhật Bản": 7, "Hàn Quốc": 6, Other: 7 },
        },
    }));

    const platformMonthlyStats = [];
    for (let monthOffset = -2; monthOffset <= 0; monthOffset += 1) {
        const month = dates.month(monthOffset);
        const year = month.year();
        const monthNumber = month.month() + 1;
        const dailyStats = [];
        const daysToInclude = monthOffset === 0 ? Math.max(14, dates.anchor.date()) : Math.min(28, month.daysInMonth());
        for (let dayNumber = 1; dayNumber <= daysToInclude; dayNumber += 1) {
            const dayKey = month.date(dayNumber).format("YYYY-MM-DD");
            const events = eventBuckets.get(dayKey) || [];
            const valid = events.filter((event) => event.isValidStream);
            const totalStreams = valid.length || 820 + dayNumber * 31 + (monthOffset + 2) * 170;
            const topTrack = tracks[(dayNumber * 3 + monthOffset + 4) % playableTracks.length];
            const topArtist = artists[(dayNumber + monthOffset + 3) % artists.length];
            dailyStats.push({
                date: dayKey,
                totalStreams,
                uniqueUsers: new Set(valid.map((event) => String(event.userId))).size || 310 + dayNumber * 4,
                totalListeningTime: valid.reduce((sum, event) => sum + event.listenedDuration, 0) || totalStreams * 248,
                topTracks: [{ trackId: topTrack._id, title: topTrack.title, streamCount: Math.round(totalStreams * 0.12) }],
                topArtists: [{ artistId: topArtist._id, streamCount: Math.round(totalStreams * 0.24) }],
            });
        }
        platformMonthlyStats.push({
            year,
            month: monthNumber,
            periodStart: month.toDate(),
            periodEnd: month.add(1, "month").toDate(),
            userStats: { newUsers: 180 + (monthOffset + 2) * 55, totalUsers: 12400 + (monthOffset + 2) * 530 },
            artistStats: { totalArtists: 680 + (monthOffset + 2) * 28 },
            streamingStats: {
                totalStreams: dailyStats.reduce((sum, item) => sum + item.totalStreams, 0),
                trackStreams: dailyStats.reduce((sum, item) => sum + item.totalStreams, 0),
                totalListeningTime: dailyStats.reduce((sum, item) => sum + item.totalListeningTime, 0),
            },
            dailyStats,
        });
    }

    const revenuePeriods = [];
    const revenueSummaries = [];
    let revenueSummaryIndex = 0;
    for (let monthOffset = -2; monthOffset <= 0; monthOffset += 1) {
        const month = dates.month(monthOffset);
        const year = month.year();
        const monthNumber = month.month() + 1;
        const premiumRevenue = 128000000 + (monthOffset + 2) * 18500000;
        const artistPool = Math.round(premiumRevenue * 0.7);
        const platformRevenue = premiumRevenue - artistPool;
        const monthlyArtist = artistMonthlyStats.filter((item) => item.year === year && item.month === monthNumber);
        const totalEligibleStreams = monthlyArtist.reduce((sum, item) => sum + Math.round(item.totalStreams * 0.91), 0);
        const status = monthOffset === 0 ? "calculated" : "confirmed";
        const dailyStats = Array.from({ length: Math.min(monthOffset === 0 ? dates.anchor.date() : 28, month.daysInMonth()) }, (_, dayIndex) => {
            const weight = 0.75 + ((dayIndex * 7) % 10) / 20;
            const dailyRevenue = Math.round((premiumRevenue / 28) * weight);
            return {
                day: dayIndex + 1,
                date: month.date(dayIndex + 1).toDate(),
                premiumRevenue: dailyRevenue,
                artistPool: Math.round(dailyRevenue * 0.7),
                platformRevenue: Math.round(dailyRevenue * 0.3),
                successfulTransactions: 30 + ((dayIndex * 3) % 17),
            };
        });
        revenuePeriods.push({
            year,
            month: monthNumber,
            periodStart: month.toDate(),
            periodEnd: month.add(1, "month").toDate(),
            status,
            totalPremiumRevenue: premiumRevenue,
            totalArtistPool: artistPool,
            totalPlatformRevenue: platformRevenue,
            totalEligibleStreams,
            successfulTransactions: dailyStats.reduce((sum, item) => sum + item.successfulTransactions, 0),
            dailyStats,
            lastAggregatedAt: dates.anchor.toDate(),
            closedAt: monthOffset < 0 ? month.endOf("month").toDate() : null,
            calculatedAt: dates.anchor.toDate(),
            confirmedAt: monthOffset < 0 ? month.add(1, "month").date(3).toDate() : null,
            confirmedBy: monthOffset < 0 ? ids.users[0] : null,
        });

        monthlyArtist.forEach((artistMonth, index) => {
            const eligibleStreams = Math.round(artistMonth.totalStreams * 0.91);
            const artistRevenueAmount = totalEligibleStreams
                ? Math.round(artistPool * (eligibleStreams / totalEligibleStreams))
                : 0;
            const withdrawnAmount = monthOffset < 0 && index % 3 === 0 ? Math.round(artistRevenueAmount * 0.25) : 0;
            revenueSummaries.push({
                _id: ids.revenueSummaries[revenueSummaryIndex++],
                artistId: artistMonth.artistId,
                year,
                month: monthNumber,
                totalEligibleStreams: eligibleStreams,
                grossRevenueAmount: Math.round(artistRevenueAmount / 0.7),
                artistRevenueAmount,
                platformRevenueAmount: Math.round(artistRevenueAmount / 0.7) - artistRevenueAmount,
                withdrawnAmount,
                availableAmount: artistRevenueAmount - withdrawnAmount,
                status: monthOffset === 0 ? "calculated" : "confirmed",
                calculatedAt: dates.anchor.toDate(),
                confirmedAt: monthOffset < 0 ? month.add(1, "month").date(3).toDate() : null,
                confirmedBy: monthOffset < 0 ? ids.users[0] : null,
            });
        });
    }

    artists.forEach((artist) => {
        const summaries = revenueSummaries.filter((item) => String(item.artistId) === String(artist._id));
        artist.revenue.totalEarnedAmount = summaries.reduce((sum, item) => sum + item.artistRevenueAmount, 0);
        artist.revenue.totalWithdrawnAmount = summaries.reduce((sum, item) => sum + item.withdrawnAmount, 0);
        artist.revenue.availableAmount = summaries.reduce((sum, item) => sum + item.availableAmount, 0);
        artist.revenue.pendingPayoutAmount = summaries.filter((item) => item.status !== "confirmed").reduce((sum, item) => sum + item.artistRevenueAmount, 0);
        artist.revenue.confirmedRevenueSummaryIds = summaries.filter((item) => item.status === "confirmed").map((item) => item._id);
    });

    const withdrawals = Array.from({ length: 20 }, (_, index) => {
        const artist = artists[index % artists.length];
        const status = ["pending", "approved", "rejected", "paid"][index % 4];
        const requestedAt = dates.at(-3 - index * 2, 10, 30).toDate();
        const amount = 500000 + (index % 6) * 350000;
        return {
            _id: ids.withdrawals[index],
            artistId: artist._id,
            amount,
            method: index % 5 === 0 ? "momo" : "bank",
            accountInfo: artist.payoutAccounts[0],
            status,
            requestedAt,
            processedBy: status === "pending" ? null : ids.users[0],
            processedAt: status === "pending" ? null : dates.at(-1 - index).toDate(),
            approvedAt: ["approved", "paid"].includes(status) ? dates.at(-1 - index).toDate() : null,
            rejectedAt: status === "rejected" ? dates.at(-1 - index).toDate() : null,
            paidAt: status === "paid" ? dates.at(-index).toDate() : null,
            paidBy: status === "paid" ? ids.users[0] : null,
            paymentReference: status === "paid" ? `PAYOUT-SEED-${String(index + 1).padStart(5, "0")}` : "",
            paymentNote: status === "paid" ? "Đã chuyển khoản payout mẫu." : "",
            adminNote: status === "approved" ? "Yêu cầu mẫu đã được phê duyệt." : "",
            rejectReason: status === "rejected" ? "Thông tin tài khoản nhận tiền chưa khớp." : "",
        };
    });

    const personalizedMixes = [];
    let mixIndex = 0;
    const mixDefinitions = [
        ["daily_mix", "Daily Mix", "frequent_listen"],
        ["discover_mix", "Khám phá hôm nay", "trending_match"],
        ["recent_mix", "Nghe lại gần đây", "liked_track"],
    ];
    listeners.forEach((user, userIndex) => {
        mixDefinitions.forEach(([mixType, title, defaultReason], definitionIndex) => {
            const selected = Array.from({ length: 18 }, (_, index) =>
                playableTracks[(userIndex * 5 + definitionIndex * 11 + index * 3) % playableTracks.length]
            );
            const primaryArtist = artists[(userIndex + definitionIndex) % artists.length];
            const primaryGenre = genres[(userIndex * 2 + definitionIndex) % 11];
            personalizedMixes.push({
                _id: ids.personalizedMixes[mixIndex++],
                userId: user._id,
                dateKey: dates.key(0),
                date: dates.storedDate(0),
                mixType,
                title: `${title} ${definitionIndex + 1}`,
                description: "Danh sách phát cá nhân hóa được seed từ lịch sử nghe, lượt thích và xu hướng.",
                basedOn: {
                    genres: [{ genreId: primaryGenre._id, name: primaryGenre.name, score: 88 - definitionIndex * 7 }],
                    artists: [{ artistId: primaryArtist._id, name: primaryArtist.name, score: 92 - definitionIndex * 6 }],
                },
                tracks: selected.map((track, index) => ({
                    trackId: track._id,
                    order: index,
                    score: round(100 - index * 2.7),
                    reason: index % 5 === 0 ? "same_genre" : index % 7 === 0 ? "same_artist" : defaultReason,
                })),
                algorithmVersion: "seed_rule_based_v1",
                generatedAt: dates.anchor.toDate(),
                expiresAt: dates.at(1).toDate(),
            });
        });
    });

    const refreshTokens = listeners.slice(0, 8).map((user, index) => ({
        _id: ids.refreshTokens[index],
        userId: user._id,
        clientType: index % 2 === 0 ? "web" : "mobile",
        token: hashToken(`reso-comprehensive-seed-refresh-${index + 1}`),
        expiresAt: dates.at(index < 6 ? 7 : -1).toDate(),
        isRevoked: index === 6,
    }));
    const verificationTokens = applicants.map((user, index) => ({
        _id: ids.verificationTokens[index],
        userId: user._id,
        email: user.email,
        token: hashToken(`reso-comprehensive-seed-verification-${index + 1}`),
        otp: `${410200 + index}`,
        type: index % 2 === 0 ? "verify_email" : "reset_password",
        expiresAt: dates.at(index < 2 ? 1 : -1).toDate(),
        isUsed: index === 3,
    }));

    return {
        plans,
        users,
        genres,
        artists,
        albums,
        tracks,
        playlists,
        listenEvents,
        recentActivities,
        interactions,
        searchEvents,
        subscriptions,
        transactions,
        artistRequests,
        verificationRequests,
        releaseSchedules,
        reports,
        notifications,
        trackDailyStats,
        artistDailyStats,
        trackDailyRankings,
        artistRankings,
        trackMonthlyStats,
        artistMonthlyStats,
        trackMonthlyRankings,
        artistStats,
        platformMonthlyStats,
        revenuePeriods,
        revenueSummaries,
        withdrawals,
        personalizedMixes,
        refreshTokens,
        verificationTokens,
        dates,
    };
};

const documentGroups = (data) => [
    ["plans", Plan, data.plans],
    ["users", User, data.users],
    ["genres", Genre, data.genres],
    ["artists", Artist, data.artists],
    ["artist requests", ArtistRequest, data.artistRequests],
    ["artist verification requests", ArtistVerificationRequest, data.verificationRequests],
    ["albums", Album, data.albums],
    ["tracks", Track, data.tracks],
    ["playlists", Playlist, data.playlists],
    ["listen events", ListenEvent, data.listenEvents],
    ["recent listening activities", UserRecentListeningActivity, data.recentActivities],
    ["interactions", Interaction, data.interactions],
    ["search events", SearchEvent, data.searchEvents],
    ["subscriptions", Subscription, data.subscriptions],
    ["transactions", Transaction, data.transactions],
    ["release schedules", ReleaseSchedule, data.releaseSchedules],
    ["reports", Report, data.reports],
    ["notifications", Notification, data.notifications],
    ["track daily stats", TrackDailyStat, data.trackDailyStats],
    ["artist daily stats", ArtistDailyStat, data.artistDailyStats],
    ["track monthly stats", TrackMonthlyStat, data.trackMonthlyStats],
    ["artist monthly stats", ArtistMonthlyStat, data.artistMonthlyStats],
    ["artist stats", ArtistStat, data.artistStats],
    ["artist revenue summaries", ArtistRevenueSummary, data.revenueSummaries],
    ["withdrawal requests", WithdrawalRequest, data.withdrawals],
    ["personalized mixes", PersonalizedMix, data.personalizedMixes],
    ["refresh tokens", RefreshToken, data.refreshTokens],
    ["verification tokens", VerificationToken, data.verificationTokens],
    ["track daily rankings", TrackDailyRanking, data.trackDailyRankings],
    ["artist rankings", ArtistRanking, data.artistRankings],
    ["track monthly rankings", TrackMonthlyRanking, data.trackMonthlyRankings],
    ["platform monthly stats", PlatformMonthlyStat, data.platformMonthlyStats],
    ["revenue periods", RevenuePeriod, data.revenuePeriods],
];

const validateSeedDocuments = (data) => {
    for (const [label, Model, documents] of documentGroups(data)) {
        for (const document of documents) {
            const error = new Model(document).validateSync();
            if (error) {
                throw new Error(`Validation failed for ${label}: ${error.message}`);
            }
        }
    }
};

const verifyUrl = async (url) => {
    const request = async (method) =>
        fetch(url, {
            method,
            redirect: "follow",
            headers: method === "GET" ? { Range: "bytes=0-1023" } : undefined,
            signal: AbortSignal.timeout(15000),
        });

    let response = await request("HEAD");
    if (!response.ok) response = await request("GET");
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || (!contentType.startsWith("image/") && !contentType.startsWith("audio/"))) {
        throw new Error(`Media URL is not usable (${response.status}, ${contentType}): ${url}`);
    }
};

const verifyRemoteMedia = async () => {
    if (typeof fetch !== "function") {
        throw new Error("--verify-media requires Node.js 18 or newer (global fetch is missing). ");
    }
    const urls = [
        ...new Set([...PHOTO_IDS, ...PORTRAIT_IDS].map((id) => imageUrl(id, 800, 800))),
        ...Array.from({ length: 16 }, (_, index) => audioUrl(index)),
    ];
    const concurrency = 6;
    for (let start = 0; start < urls.length; start += concurrency) {
        await Promise.all(urls.slice(start, start + concurrency).map(verifyUrl));
    }
    console.log(`Verified ${urls.length} remote image/audio URLs.`);
};

const cleanupSeedOwnedData = async (data) => {
    const cleanupSteps = [
        [RefreshToken, { userId: { $in: ids.users } }],
        [VerificationToken, { $or: [{ userId: { $in: ids.users } }, { _id: { $in: ids.verificationTokens } }] }],
        [Notification, { _id: { $in: ids.notifications } }],
        [Interaction, { userId: { $in: ids.users } }],
        [ListenEvent, { userId: { $in: ids.users } }],
        [SearchEvent, { userId: { $in: ids.users } }],
        [UserRecentListeningActivity, { userId: { $in: ids.users } }],
        [PersonalizedMix, { userId: { $in: ids.users } }],
        [Playlist, { _id: { $in: ids.playlists } }],
        [Report, { _id: { $in: ids.reports } }],
        [ReleaseSchedule, { _id: { $in: ids.releaseSchedules } }],
        [WithdrawalRequest, { artistId: { $in: ids.artists } }],
        [ArtistRevenueSummary, { artistId: { $in: ids.artists } }],
        [Transaction, { _id: { $in: ids.transactions } }],
        [Subscription, { _id: { $in: ids.subscriptions } }],
        [TrackDailyStat, { trackId: { $in: ids.tracks } }],
        [TrackMonthlyStat, { trackId: { $in: ids.tracks } }],
        [ArtistDailyStat, { artistId: { $in: ids.artists } }],
        [ArtistMonthlyStat, { artistId: { $in: ids.artists } }],
        [ArtistStat, { artistId: { $in: ids.artists } }],
        [TrackDailyRanking, { "rankings.trackId": { $in: ids.tracks } }],
        [TrackMonthlyRanking, { "rankings.trackId": { $in: ids.tracks } }],
        [ArtistRanking, { "rankings.artistId": { $in: ids.artists } }],
        [ArtistVerificationRequest, { artistId: { $in: ids.artists } }],
        [ArtistRequest, { _id: { $in: ids.artistRequests } }],
        [Track, { _id: { $in: ids.tracks } }],
        [Album, { _id: { $in: ids.albums } }],
        [Artist, { _id: { $in: ids.artists } }],
        [Genre, { _id: { $in: ids.genres } }],
        [User, { _id: { $in: ids.users } }],
        [Plan, { _id: { $in: ids.plans } }],
    ];

    for (const [Model, filter] of cleanupSteps) {
        await Model.deleteMany(filter);
    }

    // These are global monthly snapshots. Only the three months generated by this run are replaced.
    for (const item of data.platformMonthlyStats) {
        await PlatformMonthlyStat.deleteMany({ year: item.year, month: item.month });
    }
    for (const item of data.revenuePeriods) {
        await RevenuePeriod.deleteMany({ year: item.year, month: item.month });
    }
};

const insertInChunks = async (Model, documents, chunkSize = 1000) => {
    for (let start = 0; start < documents.length; start += chunkSize) {
        await Model.insertMany(documents.slice(start, start + chunkSize), { ordered: true });
    }
};

const replaceGlobalDocuments = async (data) => {
    for (const item of data.trackDailyRankings) {
        await TrackDailyRanking.replaceOne({ date: item.date }, item, { upsert: true });
    }
    for (const item of data.trackMonthlyRankings) {
        await TrackMonthlyRanking.replaceOne({ year: item.year, month: item.month }, item, { upsert: true });
    }
    for (const item of data.artistRankings) {
        const filter = item.periodType === "daily"
            ? { periodType: "daily", dateKey: item.dateKey }
            : { periodType: "monthly", year: item.year, month: item.month };
        await ArtistRanking.replaceOne(filter, item, { upsert: true });
    }
    for (const item of data.platformMonthlyStats) {
        await PlatformMonthlyStat.replaceOne({ year: item.year, month: item.month }, item, { upsert: true });
    }
    for (const item of data.revenuePeriods) {
        await RevenuePeriod.replaceOne({ year: item.year, month: item.month }, item, { upsert: true });
    }
};

const insertSeedData = async (data) => {
    const insertionGroups = documentGroups(data).filter(
        ([label]) => ![
            "track daily rankings",
            "artist rankings",
            "track monthly rankings",
            "platform monthly stats",
            "revenue periods",
        ].includes(label)
    );

    for (const [label, Model, documents] of insertionGroups) {
        await insertInChunks(Model, documents);
        console.log(`Seeded ${String(documents.length).padStart(5, " ")} ${label}.`);
    }
    await replaceGlobalDocuments(data);
    console.log("Seeded global daily/monthly rankings, platform stats and revenue periods.");
};

const printSummary = (data, mode) => {
    const futureStart = data.dates.key(1);
    const futureEnd = data.dates.key(FUTURE_DAYS);
    const totalDocuments = documentGroups(data).reduce((sum, [, , documents]) => sum + documents.length, 0);
    console.log("\nComprehensive Reso seed summary");
    console.log(`Mode: ${mode}`);
    console.log(`Timezone: ${ANALYTICS_TIMEZONE}`);
    console.log(`Documents prepared: ${totalDocuments}`);
    console.log(`Users / artists / tracks: ${data.users.length} / ${data.artists.length} / ${data.tracks.length}`);
    console.log(`ListenEvent records: ${data.listenEvents.length}`);
    console.log(`Future ListenEvent coverage: ${futureStart} -> ${futureEnd}`);
    console.log(`Login: admin@reso.seed or listener01@reso.seed / password: ${SEED_PASSWORD}`);
};

const main = async () => {
    const data = await buildSeedData();
    validateSeedDocuments(data);
    if (VERIFY_MEDIA) await verifyRemoteMedia();

    if (DRY_RUN) {
        printSummary(data, "dry-run (MongoDB was not changed)");
        return;
    }

    if (!process.env.DATABASE) {
        throw new Error("DATABASE is missing. Configure it in .env or use --dry-run.");
    }

    mongoose.set("autoIndex", false);
    await mongoose.connect(process.env.DATABASE);
    console.log("Connected to MongoDB. Cleaning only deterministic comprehensive-seed records...");
    await cleanupSeedOwnedData(data);
    await insertSeedData(data);
    printSummary(data, "database seed completed");
};

main()
    .catch((error) => {
        console.error("Comprehensive seed failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    });
