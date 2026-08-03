import { jest } from "@jest/globals";
import createAwaitableQuery from "./helpers/createAwaitableQuery.js";

const mockAlbumModel = {
    findOne: jest.fn(),
};

const mockTrackModel = {
    find: jest.fn(),
};

const mockEnrichAlbumWithTotalDuration = jest.fn();

const loadAlbumService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Album.js", () => ({
        default: mockAlbumModel,
    }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: { findOne: jest.fn() },
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));
    jest.unstable_mockModule("../../src/services/album/album.sync.js", () => ({
        enrichAlbumWithTotalDuration: mockEnrichAlbumWithTotalDuration,
        enrichAlbumsWithTotalDuration: jest.fn(),
    }));

    const { default: albumService } = await import(
        "../../src/services/album/album.service.js"
    );

    return { albumService };
};

describe("View Album Details - albumService.getAlbumDetail", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns formatted album detail, appends orphan tracks, and sorts by order", async () => {
        const { albumService } = await loadAlbumService();
        const albumDoc = {
            _id: "507f1f77bcf86cd799439161",
            title: "Album Detail",
            coverImage: "album.png",
            releaseDate: new Date("2026-07-01T00:00:00.000Z"),
            status: "active",
            totalDuration: 0,
            trackList: [
                {
                    order: 2,
                    trackId: {
                        _id: "507f1f77bcf86cd799439261",
                        title: "Second Track",
                        duration: 210,
                        avatar: "second.png",
                        coverImage: [],
                        audioFiles: [],
                        lyricsStatic: "",
                        lyricsSyncUrl: "",
                        stats: { totalPlay: 10 },
                        releaseDate: new Date("2026-07-01T00:00:00.000Z"),
                        activeStatus: "active",
                        approvalStatus: "approved",
                        artist_artistId: {
                            _id: "507f1f77bcf86cd799439361",
                            name: "Artist A",
                            avatar: "artist.png",
                            coverImage: "artist-cover.png",
                        },
                    },
                },
            ],
            artistId: {
                _id: "507f1f77bcf86cd799439461",
                name: "Album Artist",
                bio: "bio",
                avatar: "artist.png",
                coverImage: "artist-cover.png",
                verificationStatus: "verified",
                activeStatus: "active",
                stats: { followers: 12 },
            },
            createdAt: new Date("2026-07-01T00:00:00.000Z"),
            updatedAt: new Date("2026-07-02T00:00:00.000Z"),
        };
        const orphanTrack = {
            _id: "507f1f77bcf86cd799439262",
            title: "Orphan Track",
            duration: 180,
            avatar: "orphan.png",
            coverImage: [],
            audioFiles: [],
            lyricsStatic: "",
            lyricsSyncUrl: "",
            stats: { totalPlay: 5 },
            releaseDate: new Date("2026-07-02T00:00:00.000Z"),
            activeStatus: "active",
            approvalStatus: "approved",
            artist_artistId: {
                _id: "507f1f77bcf86cd799439361",
                name: "Artist A",
                avatar: "artist.png",
                coverImage: "artist-cover.png",
            },
        };

        mockAlbumModel.findOne.mockReturnValue(createAwaitableQuery(albumDoc));
        mockTrackModel.find.mockReturnValue(createAwaitableQuery([orphanTrack], [
            "select",
            "populate",
            "lean",
        ]));

        const result = await albumService.getAlbumDetail(
            "507f1f77bcf86cd799439161"
        );

        expect(mockTrackModel.find).toHaveBeenCalledWith({
            album_albumId: "507f1f77bcf86cd799439161",
            _id: { $nin: ["507f1f77bcf86cd799439261"] },
        });
        expect(mockEnrichAlbumWithTotalDuration).toHaveBeenCalledWith(albumDoc);
        expect(result.artist).toEqual(
            expect.objectContaining({
                id: "507f1f77bcf86cd799439461",
                name: "Album Artist",
            })
        );
        expect(result.tracks.map((item) => item.track.title)).toEqual([
            "Second Track",
            "Orphan Track",
        ]);
    });

    test("throws 400 when album id is invalid", async () => {
        const { albumService } = await loadAlbumService();

        await expect(albumService.getAlbumDetail("invalid-id")).rejects.toMatchObject({
            message: "Album id is invalid.",
            statusCode: 400,
            details: { field: "id" },
        });
    });

    test("throws 404 when album is not found", async () => {
        const { albumService } = await loadAlbumService();
        mockAlbumModel.findOne.mockReturnValue(createAwaitableQuery(null));

        await expect(
            albumService.getAlbumDetail("507f1f77bcf86cd799439162")
        ).rejects.toMatchObject({
            message: "Album not found.",
            statusCode: 404,
        });
    });

    test("propagates database errors while loading album detail", async () => {
        const { albumService } = await loadAlbumService();
        mockAlbumModel.findOne.mockImplementation(() => {
            throw new Error("album database unavailable");
        });

        await expect(
            albumService.getAlbumDetail("507f1f77bcf86cd799439163")
        ).rejects.toThrow("album database unavailable");
        expect(mockTrackModel.find).not.toHaveBeenCalled();
    });
});
