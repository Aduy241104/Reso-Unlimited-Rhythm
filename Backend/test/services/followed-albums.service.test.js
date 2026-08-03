import { jest } from "@jest/globals";

const mockInteractionModel = {
    aggregate: jest.fn(),
};

const loadLibraryService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Interaction.js", () => ({
        default: mockInteractionModel,
    }));

    const { default: libaryService } = await import(
        "../../src/services/libary/libary.service.js"
    );

    return { libaryService };
};

describe("Album Follow State - libaryService.getMyFollowedAlbumsByUserId", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns paginated followed albums from the aggregation pipeline", async () => {
        const { libaryService } = await loadLibraryService();
        mockInteractionModel.aggregate.mockResolvedValue([
            {
                interactions: [
                    {
                        targetId: {
                            _id: "507f1f77bcf86cd799439171",
                            title: "Followed Album",
                            coverImage: "album.png",
                            trackList: [{ trackId: "t1" }],
                            artistId: {
                                name: "Followed Artist",
                            },
                        },
                    },
                ],
                totalCount: [{ total: 3 }],
            },
        ]);

        const result = await libaryService.getMyFollowedAlbumsByUserId(
            "507f1f77bcf86cd799439571",
            { page: "2", limit: "1" }
        );

        expect(result).toEqual({
            albums: [
                {
                    albumId: "507f1f77bcf86cd799439171",
                    title: "Followed Album",
                    coverImage: "album.png",
                    artistName: "Followed Artist",
                    trackList: [{ trackId: "t1" }],
                },
            ],
            pagination: {
                page: 2,
                limit: 1,
                total: 3,
                totalPages: 3,
            },
        });
    });

    test("returns an empty list when the aggregation has no interactions", async () => {
        const { libaryService } = await loadLibraryService();
        mockInteractionModel.aggregate.mockResolvedValue([
            {
                interactions: [],
                totalCount: [{ total: 0 }],
            },
        ]);

        const result = await libaryService.getMyFollowedAlbumsByUserId(
            "507f1f77bcf86cd799439572"
        );

        expect(result).toEqual({
            albums: [],
            pagination: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
            },
        });
    });

    test("caps the aggregation page size at 50", async () => {
        const { libaryService } = await loadLibraryService();
        mockInteractionModel.aggregate.mockResolvedValue([
            {
                interactions: [],
                totalCount: [{ total: 0 }],
            },
        ]);

        await libaryService.getMyFollowedAlbumsByUserId(
            "507f1f77bcf86cd799439573",
            { page: "1", limit: "999" }
        );

        const pipeline = mockInteractionModel.aggregate.mock.calls[0][0];
        const facetStage = pipeline.find((stage) => stage.$facet);

        expect(facetStage.$facet.interactions).toEqual(
            expect.arrayContaining([{ $limit: 50 }])
        );
    });
});
