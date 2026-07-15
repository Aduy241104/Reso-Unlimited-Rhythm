import dotenv from "dotenv";
import mongoose from "mongoose";
import Artist from "./models/Artist.js";
import ArtistRevenueSummary from "./models/ArtistRevenueSummary.js";

dotenv.config();

const DEFAULT_ARTIST_ID = "681300000000000000000301";
const DEFAULT_BALANCE_AMOUNT = 100000000;

const readCliOption = (optionName, fallbackValue) => {
    const matchedArgument = process.argv.find((argument) =>
        argument.startsWith(`${optionName}=`)
    );

    if (!matchedArgument) {
        return fallbackValue;
    }

    const [, value = ""] = matchedArgument.split("=");
    return value || fallbackValue;
};

const connectDatabase = async () => {
    if (!process.env.DATABASE) {
        throw new Error("Missing DATABASE in .env");
    }

    await mongoose.connect(process.env.DATABASE);
};

const main = async () => {
    const artistId = readCliOption("--artistId", DEFAULT_ARTIST_ID);
    const balanceAmount = Number(
        readCliOption("--amount", DEFAULT_BALANCE_AMOUNT)
    );

    if (!mongoose.Types.ObjectId.isValid(artistId)) {
        throw new Error(`Artist ID is invalid: ${artistId}`);
    }

    if (!Number.isFinite(balanceAmount) || balanceAmount < 0) {
        throw new Error(`Balance amount is invalid: ${balanceAmount}`);
    }

    await connectDatabase();

    const artistObjectId = new mongoose.Types.ObjectId(artistId);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const artist = await Artist.findById(artistObjectId).select("_id name revenue");

    if (!artist) {
        throw new Error(`Artist not found: ${artistId}`);
    }

    await ArtistRevenueSummary.findOneAndUpdate(
        {
            artistId: artistObjectId,
            year,
            month,
        },
        {
            $set: {
                totalEligibleStreams: 0,
                grossRevenueAmount: balanceAmount,
                artistRevenueAmount: balanceAmount,
                platformRevenueAmount: 0,
                withdrawnAmount: 0,
                availableAmount: balanceAmount,
                status: "calculated",
                calculatedAt: now,
            },
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );

    await Artist.updateOne(
        { _id: artistObjectId },
        {
            $set: {
                "revenue.totalEarnedAmount": balanceAmount,
                "revenue.totalWithdrawnAmount": 0,
                "revenue.availableAmount": balanceAmount,
                "revenue.pendingPayoutAmount": 0,
            },
        }
    );

    console.log(
        `Seeded withdrawal balance ${balanceAmount} VND for artist ${artist.name || artistId} (${artistId}) in ${month}/${year}.`
    );

    await mongoose.disconnect();
};

main().catch((error) => {
    console.error("Failed to seed withdrawal balance:", error.message);
    process.exitCode = 1;
});
