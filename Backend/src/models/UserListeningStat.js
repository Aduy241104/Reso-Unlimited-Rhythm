import mongoose from "mongoose";

const { Schema, model } = mongoose;

const TopGenreSchema = new Schema(
    {
        genreId: { type: Schema.Types.ObjectId, ref: "Genre" },
        genreName: { type: String, default: "" },
        playCount: { type: Number, default: 0, min: 0 },
        listeningTime: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);

const TopTrackSchema = new Schema(
    {
        trackId: { type: Schema.Types.ObjectId, ref: "Track" },
        title: { type: String, default: "" },
        playCount: { type: Number, default: 0, min: 0 },
        listeningTime: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);

const TopArtistSchema = new Schema(
    {
        artistId: { type: Schema.Types.ObjectId, ref: "Artist" },
        name: { type: String, default: "" },
        playCount: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);

const UserListeningStatSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        year: { type: Number, required: true, min: 2000 },
        week: { type: Number, required: true, min: 1, max: 53 },
        stats_totalListeningTime: { type: Number, default: 0, min: 0 },
        stats_totalTracksPlayed: { type: Number, default: 0, min: 0 },
        topGenres: [TopGenreSchema],
        topTracks: [TopTrackSchema],
        topArtists: [TopArtistSchema],
    },
    { timestamps: true }
);

UserListeningStatSchema.index({ userId: 1, year: 1, week: 1 }, { unique: true });

const UserListeningStat = model("UserListeningStat", UserListeningStatSchema);
export default UserListeningStat;