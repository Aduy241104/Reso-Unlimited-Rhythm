import mongoose from "mongoose";
import Album from "../../models/Album.js";
import Artist from "../../models/Artist.js";
import ArtistStat from "../../models/ArtistStat.js";
import Track from "../../models/Track.js";
import { AppError } from "../../utils/AppError.js";
import { formatArtistProfile } from "./artist.helper.js";

const getArtistProfile = async (artistId) => {
    if (!mongoose.Types.ObjectId.isValid(artistId)) {
        throw new AppError("Artist id is invalid.", 400, {
            field: "id",
        });
    }

    const artist = await Artist.findOne({
        _id: artistId,
        activeStatus: "active",
    }).lean();

    if (!artist) {
        throw new AppError("Artist not found.", 404);
    }

    const [artistStat, albums, tracks] = await Promise.all([
        ArtistStat.findOne({
            artistId,
        }).lean(),
        Album.find({
            artistId,
            status: "active",
        })
            .sort({ releaseDate: -1, totalPlays: -1, createdAt: -1, _id: -1 })
            .lean(),
        Track.find({
            artist_artistId: artistId,
            activeStatus: "active",
            approvalStatus: "approved",
        })
            .sort({ releaseDate: -1, "stats.totalPlay": -1, createdAt: -1, _id: -1 })
            .populate({
                path: "album_albumId",
                select: "title coverImage releaseDate",
                match: { status: "active" },
            })
            .lean(),
    ]);

    return formatArtistProfile({
        artist,
        artistStat,
        albums,
        tracks,
    });
};

export default {
    getArtistProfile,
};
