import dotenv from "dotenv";
import mongoose from "mongoose";
import Advertisement from "../src/models/Advertisement.js";
import AdEvent from "../src/models/AdEvent.js";
import User from "../src/models/User.js";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");
const IDS = {
  skippableAudio: new mongoose.Types.ObjectId("7ead00000000000000000003"),
  nonSkippableAudio: new mongoose.Types.ObjectId("7ead00000000000000000004"),
};

const buildCampaigns = (adminId, now = new Date()) => {
  const startedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const common = {
    startAt: startedAt,
    endAt: endsAt,
    createdBy: adminId,
    updatedBy: adminId,
    targeting: { placements: ["between_tracks"] },
  };

  return [
    {
      ...common,
      _id: IDS.skippableAudio,
      title: "Reso Premium - nghe nhạc không quảng cáo",
      advertiserName: "Reso Premium",
      type: "audio",
      status: "active",
      mediaUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
      thumbnailUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&h=600&q=82",
      clickUrl: "https://example.com/reso-premium",
      priority: 7,
      frequencyCap: { maxPerHour: 4, minTracksBetweenAds: 3, minMinutesBetweenAds: 1 },
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
      frequencyCap: { maxPerHour: 4, minTracksBetweenAds: 3, minMinutesBetweenAds: 1 },
      skipEnabled: false,
      skipAfterSeconds: 0,
      duration: 3,
    },
  ];
};

const buildEvents = (adminId, now = new Date()) => {
  const events = [];
  const add = (advertisementId, type, count) => {
    for (let index = 0; index < count; index += 1) {
      const decisionId = `seed-${advertisementId}-${type}-${index + 1}`;
      events.push({
        advertisementId,
        type,
        adType: "audio",
        sessionHash: `seed-session-${String(index % 12).padStart(2, "0")}`,
        userId: adminId,
        decisionId,
        dedupeKey: `${decisionId}:${type}`,
        placement: "between_tracks",
        playedSeconds: type === "complete" ? 3 : type === "skip" ? 1 : 0,
        occurredAt: new Date(now.getTime() - index * 18 * 60 * 1000),
      });
    }
  };

  add(IDS.skippableAudio, "impression", 12);
  add(IDS.skippableAudio, "complete", 8);
  add(IDS.skippableAudio, "skip", 4);
  add(IDS.nonSkippableAudio, "impression", 7);
  add(IDS.nonSkippableAudio, "complete", 7);
  return events;
};

const main = async () => {
  if (!process.env.DATABASE) throw new Error("DATABASE is missing in Backend/.env.");
  await mongoose.connect(process.env.DATABASE);
  const admin = await User.findOne({ role: "admin", activeStatus: "active" }).select("_id email").lean();
  if (!admin) throw new Error("No active admin found. Create an admin or run the comprehensive seed first.");

  const campaigns = buildCampaigns(admin._id);
  const events = buildEvents(admin._id);
  if (DRY_RUN) {
    console.log(`Dry run: ${campaigns.length} audio campaigns and ${events.length} events prepared for ${admin.email}.`);
    return;
  }

  for (const campaign of campaigns) await Advertisement.replaceOne({ _id: campaign._id }, campaign, { upsert: true });
  await AdEvent.deleteMany({ advertisementId: { $in: Object.values(IDS) }, decisionId: /^seed-/ });
  await AdEvent.insertMany(events, { ordered: true });
  console.log(`Seeded ${campaigns.length} audio campaigns and ${events.length} events.`);
};

main().catch((error) => {
  console.error("Advertisement seed failed:", error);
  process.exitCode = 1;
}).finally(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});
