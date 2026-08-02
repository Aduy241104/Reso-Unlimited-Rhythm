import { formatAlbumDetail } from "../../src/services/album/album.helper.js";

const buildTrackItem = ({ id, activeStatus, order }) => ({
    order,
    trackId: {
        _id: id,
        title: `Track ${order}`,
        duration: 180,
        avatar: "avatar.jpg",
        coverImage: ["cover.jpg"],
        audioFiles: [
            {
                url: "https://example.com/audio.mp3",
                format: "mp3",
                bitrate: 320,
            },
        ],
        lyricsStatic: "Lyrics",
        lyricsSyncUrl: "",
        stats: { totalLike: 0, totalPlay: 0 },
        releaseDate: new Date("2026-07-01T00:00:00.000Z"),
        activeStatus,
        approvalStatus: "approved",
        artist_artistId: null,
    },
});

describe("album helper", () => {
    test("marks hidden and blocked tracks without exposing audioFiles", () => {
        const result = formatAlbumDetail({
            _id: "507f1f77bcf86cd799439011",
            title: "Album",
            trackList: [
                buildTrackItem({
                    id: "507f1f77bcf86cd799439021",
                    activeStatus: "active",
                    order: 1,
                }),
                buildTrackItem({
                    id: "507f1f77bcf86cd799439022",
                    activeStatus: "hidden",
                    order: 2,
                }),
                buildTrackItem({
                    id: "507f1f77bcf86cd799439023",
                    activeStatus: "blocked",
                    order: 3,
                }),
            ],
        });

        expect(result.tracks.map(({ track }) => ({
            activeStatus: track.activeStatus,
            isHidden: track.isHidden,
            isBlocked: track.isBlocked,
            hasAudioFiles: Object.hasOwn(track, "audioFiles"),
        }))).toEqual([
            {
                activeStatus: "active",
                isHidden: false,
                isBlocked: false,
                hasAudioFiles: false,
            },
            {
                activeStatus: "hidden",
                isHidden: true,
                isBlocked: false,
                hasAudioFiles: false,
            },
            {
                activeStatus: "blocked",
                isHidden: false,
                isBlocked: true,
                hasAudioFiles: false,
            },
        ]);
    });
});
