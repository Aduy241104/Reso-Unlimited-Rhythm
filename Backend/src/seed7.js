import dotenv from "dotenv";
import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import Track from "./models/Track.js";
import TrackDailyStat from "./models/TrackDailyStat.js";
import TrackMonthlyStat from "./models/TrackMonthlyStat.js";

dotenv.config();

dayjs.extend(utc);
dayjs.extend(timezone);

const ANALYTICS_TIMEZONE = "Asia/Ho_Chi_Minh";
const TRACK_ID = "6a237d81b4e5f31659598496";

const DAILY_POINTS = [
  { daysAgo: 1, playCount: 18, uniqueListeners: 11, averageListenDuration: 201, skipCount: 2, segment: "7d" },
  { daysAgo: 3, playCount: 9, uniqueListeners: 5, averageListenDuration: 146, skipCount: 1, segment: "7d" },
  { daysAgo: 6, playCount: 3, uniqueListeners: 2, averageListenDuration: 74, skipCount: 1, segment: "7d" },
  { daysAgo: 12, playCount: 5, uniqueListeners: 4, averageListenDuration: 133, skipCount: 1, segment: "30d" },
  { daysAgo: 21, playCount: 4, uniqueListeners: 3, averageListenDuration: 118, skipCount: 1, segment: "30d" },
  { daysAgo: 46, playCount: 11, uniqueListeners: 7, averageListenDuration: 164, skipCount: 2, segment: "90d" },
  { daysAgo: 74, playCount: 13, uniqueListeners: 8, averageListenDuration: 172, skipCount: 1, segment: "90d" },
  { daysAgo: 154, playCount: 24, uniqueListeners: 13, averageListenDuration: 188, skipCount: 2, segment: "all" },
  { daysAgo: 251, playCount: 32, uniqueListeners: 17, averageListenDuration: 215, skipCount: 3, segment: "all" },
];

const connectDatabase = async () => {
  if (!process.env.DATABASE) {
    throw new Error("Missing DATABASE in .env");
  }

  await mongoose.connect(process.env.DATABASE);
};

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

const toDateKey = (dateValue) => dateValue.tz(ANALYTICS_TIMEZONE).format("YYYY-MM-DD");

const toDateValue = (dateKey) => new Date(`${dateKey}T00:00:00+07:00`);

const buildDailyStats = (baseDay) =>
  DAILY_POINTS.map((point) => {
    const targetDay = baseDay.subtract(point.daysAgo, "day");
    const dateKey = toDateKey(targetDay);

    return {
      trackId: toObjectId(TRACK_ID),
      dateKey,
      date: toDateValue(dateKey),
      playCount: point.playCount,
      uniqueListeners: point.uniqueListeners,
      averageListenDuration: point.averageListenDuration,
      skipCount: point.skipCount,
      metaSegment: point.segment,
    };
  }).sort((left, right) => left.dateKey.localeCompare(right.dateKey));

const buildMonthlyStats = (dailyStats) => {
  const monthlyMap = new Map();

  dailyStats.forEach((stat) => {
    const monthKey = stat.dateKey.slice(0, 7);
    const current = monthlyMap.get(monthKey) || {
      year: Number(monthKey.slice(0, 4)),
      month: Number(monthKey.slice(5, 7)),
      playCount: 0,
      uniqueListeners: 0,
      totalListeningSeconds: 0,
      skipCount: 0,
    };

    current.playCount += stat.playCount;
    current.uniqueListeners += stat.uniqueListeners;
    current.totalListeningSeconds +=
      stat.playCount * stat.averageListenDuration;
    current.skipCount += stat.skipCount;
    monthlyMap.set(monthKey, current);
  });

  return [...monthlyMap.values()]
    .map((item) => {
      const eligibleStreams = Math.max(item.playCount - item.skipCount, 0);
      const grossRevenueAmount = Number((eligibleStreams * 1250).toFixed(2));
      const artistRevenueAmount = Number((grossRevenueAmount * 0.7).toFixed(2));
      const platformRevenueAmount = Number(
        (grossRevenueAmount - artistRevenueAmount).toFixed(2)
      );

      return {
        trackId: toObjectId(TRACK_ID),
        year: item.year,
        month: item.month,
        playCount: item.playCount,
        uniqueListeners: item.uniqueListeners,
        revenue: {
          eligibleStreams,
          grossRevenueAmount,
          artistRevenueAmount,
          platformRevenueAmount,
          revenueSharePercent: 70,
          calculatedAt: new Date(),
        },
      };
    })
    .sort(
      (left, right) =>
        left.year - right.year || left.month - right.month
    );
};

const buildRangeSummary = (dailyStats) => {
  const totals = {
    "7d": 0,
    "30d": 0,
    "90d": 0,
    all: 0,
  };

  dailyStats.forEach((stat) => {
    totals.all += stat.playCount;

    const sourcePoint = DAILY_POINTS.find((point) => {
      const targetDate = dayjs()
        .tz(ANALYTICS_TIMEZONE)
        .startOf("day")
        .subtract(point.daysAgo, "day");
      return toDateKey(targetDate) === stat.dateKey;
    });

    if (!sourcePoint) {
      return;
    }

    if (sourcePoint.daysAgo <= 89) {
      totals["90d"] += stat.playCount;
    }

    if (sourcePoint.daysAgo <= 29) {
      totals["30d"] += stat.playCount;
    }

    if (sourcePoint.daysAgo <= 6) {
      totals["7d"] += stat.playCount;
    }
  });

  return totals;
};

const updateTrackStats = async (trackId, totalPlay) => {
  await Track.updateOne(
    { _id: trackId },
    {
      $set: {
        "stats.totalPlay": totalPlay,
      },
    }
  );
};

const run = async () => {
  try {
    await connectDatabase();

    const objectId = toObjectId(TRACK_ID);
    const track = await Track.findById(objectId)
      .select("_id title duration stats.totalPlay")
      .lean();

    if (!track) {
      throw new Error(`Track ${TRACK_ID} was not found.`);
    }

    const today = dayjs().tz(ANALYTICS_TIMEZONE).startOf("day");
    const dailyStats = buildDailyStats(today);
    const monthlyStats = buildMonthlyStats(dailyStats);
    const rangeSummary = buildRangeSummary(dailyStats);

    const [deletedDaily, deletedMonthly] = await Promise.all([
      TrackDailyStat.deleteMany({ trackId: objectId }),
      TrackMonthlyStat.deleteMany({ trackId: objectId }),
    ]);

    await TrackDailyStat.insertMany(
      dailyStats.map(({ metaSegment: _metaSegment, ...stat }) => stat)
    );
    await TrackMonthlyStat.insertMany(monthlyStats);
    await updateTrackStats(objectId, rangeSummary.all);

    console.log("Seed7 completed successfully.");
    console.log(`Track: ${track.title} (${TRACK_ID})`);
    console.log(`Analytics timezone: ${ANALYTICS_TIMEZONE}`);
    console.log(`Removed ${deletedDaily.deletedCount || 0} daily stats.`);
    console.log(`Removed ${deletedMonthly.deletedCount || 0} monthly stats.`);
    console.log(`Inserted ${dailyStats.length} daily stats.`);
    console.log(`Inserted ${monthlyStats.length} monthly stats.`);
    console.log("Range totals prepared for quick UI verification:");
    console.log(`  7d  -> ${rangeSummary["7d"]} plays`);
    console.log(`  30d -> ${rangeSummary["30d"]} plays`);
    console.log(`  90d -> ${rangeSummary["90d"]} plays`);
    console.log(`  all -> ${rangeSummary.all} plays`);
    console.log("Daily points:");
    dailyStats.forEach((stat) => {
      console.log(
        `  ${stat.dateKey} | plays=${stat.playCount} | listeners=${stat.uniqueListeners} | avgSec=${stat.averageListenDuration} | skips=${stat.skipCount} | segment=${stat.metaSegment}`
      );
    });
  } catch (error) {
    console.error("Seed7 failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

void run();
