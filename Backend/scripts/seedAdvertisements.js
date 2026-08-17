import dotenv from "dotenv";
import mongoose from "mongoose";
import Advertisement from "../src/models/Advertisement.js";
import AdEvent from "../src/models/AdEvent.js";
import User from "../src/models/User.js";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");
const IDS = {
    homeBanner: new mongoose.Types.ObjectId("7ead00000000000000000001"),
    searchBanner: new mongoose.Types.ObjectId("7ead00000000000000000002"),
    skippableAudio: new mongoose.Types.ObjectId("7ead00000000000000000003"),
    nonSkippableAudio: new mongoose.Types.ObjectId("7ead00000000000000000004"),
    draftBanner: new mongoose.Types.ObjectId("7ead00000000000000000005"),
};

const buildCampaigns = (adminId, now = new Date()) => {
    const startedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const common = {
        startAt: startedAt,
        endAt: endsAt,
        createdBy: adminId,
        updatedBy: adminId,
        targeting: { genres: [], countries: [], placements: [] },
    };

    return [
        {
            ...common,
            _id: IDS.homeBanner,
            title: "Reso Summer Listening",
            advertiserName: "Reso Music",
            type: "banner",
            status: "active",
            mediaUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1800&h=360&q=85",
            thumbnailUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&h=300&q=80",
            clickUrl: "https://example.com/reso-summer",
            priority: 8,
            targeting: { genres: [], countries: [], placements: ["home"] },
            frequencyCap: { maxPerHour: 4, minTracksBetweenAds: 0, minMinutesBetweenAds: 0 },
            skipEnabled: false,
            skipAfterSeconds: 0,
        },
        {
            ...common,
            _id: IDS.searchBanner,
            title: "Tai nghe Studio Week",
            advertiserName: "Reso Gear",
            type: "banner",
            status: "active",
            mediaUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1800&h=360&q=85",
            thumbnailUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&h=300&q=80",
            clickUrl: "https://example.com/reso-gear",
            priority: 6,
            targeting: { genres: [], countries: [], placements: ["search"] },
            frequencyCap: { maxPerHour: 4, minTracksBetweenAds: 0, minMinutesBetweenAds: 0 },
            skipEnabled: false,
            skipAfterSeconds: 0,
        },
        {
            ...common,
            _id: IDS.skippableAudio,
            title: "Reso Premium – nghe nhạc không quảng cáo",
            advertiserName: "Reso Premium",
            type: "audio",
            status: "active",
            mediaUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
            thumbnailUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&h=600&q=82",
            clickUrl: "https://example.com/reso-premium",
            priority: 7,
            targeting: { genres: [], countries: [], placements: ["between_tracks"] },
            frequencyCap: { maxPerHour: 4, minTracksBetweenAds: 1, minMinutesBetweenAds: 1 },
            skipEnabled: true,
            skipAfterSeconds: 1,
            duration: 3,
        },
        {
            ...common,
            _id: IDS.nonSkippableAudio,
            title: "Reso Live Sessions",
            advertiserName: "Reso Events",
            type: "audio",
            status: "active",
            mediaUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
            thumbnailUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&h=600&q=82",
            clickUrl: "https://example.com/reso-live",
            priority: 3,
            targeting: { genres: [], countries: [], placements: ["between_tracks"] },
            frequencyCap: { maxPerHour: 4, minTracksBetweenAds: 1, minMinutesBetweenAds: 1 },
            skipEnabled: false,
            skipAfterSeconds: 0,
            duration: 3,
        },
        {
            ...common,
            _id: IDS.draftBanner,
            title: "Artist Spotlight – Coming Soon",
            advertiserName: "Reso for Artists",
            type: "banner",
            status: "draft",
            mediaUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1800&h=360&q=85",
            thumbnailUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=600&h=300&q=80",
            clickUrl: "https://example.com/reso-artists",
            priority: 4,
            targeting: { genres: [], countries: ["VN"], placements: ["home", "search"] },
            frequencyCap: { maxPerHour: 2, minTracksBetweenAds: 0, minMinutesBetweenAds: 0 },
            skipEnabled: false,
            skipAfterSeconds: 0,
        },
    ];
};

const buildAnalyticsEvents = (adminId, now = new Date()) => {
    const events = [];
    const add = (advertisementId, adType, type, count, placement) => {
        for (let index = 0; index < count; index += 1) {
            const decisionId = `seed-${advertisementId}-${type}-${index + 1}`;
            events.push({
                advertisementId,
                type,
                adType,
                sessionHash: `seed-session-${String(index % 12).padStart(2, "0")}`,
                userId: adminId,
                decisionId,
                dedupeKey: `${decisionId}:${type}`,
                placement,
                playedSeconds: type === "complete" ? 3 : type === "skip" ? 1 : 0,
                occurredAt: new Date(now.getTime() - index * 18 * 60 * 1000),
            });
        }
    };

    add(IDS.homeBanner, "banner", "impression", 24, "home");
    add(IDS.homeBanner, "banner", "click", 5, "home");
    add(IDS.searchBanner, "banner", "impression", 16, "search");
    add(IDS.searchBanner, "banner", "click", 2, "search");
    add(IDS.skippableAudio, "audio", "impression", 12, "between_tracks");
    add(IDS.skippableAudio, "audio", "complete", 8, "between_tracks");
    add(IDS.skippableAudio, "audio", "skip", 4, "between_tracks");
    add(IDS.nonSkippableAudio, "audio", "impression", 7, "between_tracks");
    add(IDS.nonSkippableAudio, "audio", "complete", 7, "between_tracks");
    return events;
};

const main = async () => {
    if (!process.env.DATABASE) throw new Error("DATABASE is missing in Backend/.env.");
    await mongoose.connect(process.env.DATABASE);
    const admin = await User.findOne({ role: "admin", activeStatus: "active" }).select("_id email").lean();
    if (!admin) throw new Error("No active admin found. Create an admin or run the comprehensive seed first.");

    const campaigns = buildCampaigns(admin._id);
    const events = buildAnalyticsEvents(admin._id);
    if (DRY_RUN) {
        console.log(`Dry run: ${campaigns.length} campaigns and ${events.length} analytics events prepared for ${admin.email}.`);
        return;
    }

    for (const campaign of campaigns) {
        await Advertisement.replaceOne({ _id: campaign._id }, campaign, { upsert: true });
    }
    await AdEvent.deleteMany({ advertisementId: { $in: Object.values(IDS) }, decisionId: /^seed-/ });
    await AdEvent.insertMany(events, { ordered: true });

    console.log(`Seeded ${campaigns.length} advertisement campaigns and ${events.length} analytics events.`);
    campaigns.forEach((campaign) => console.log(`- [${campaign.status}] ${campaign.type}: ${campaign.title}`));
};

main().catch((error) => {
    console.error("Advertisement seed failed:", error);
    process.exitCode = 1;
}).finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});
