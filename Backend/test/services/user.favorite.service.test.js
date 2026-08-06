import { jest } from "@jest/globals";

const mockInteractionModel = {
    create: jest.fn(),
    deleteOne: jest.fn(),
    findOne: jest.fn(),
};

const mockTrackModel = {
    findById: jest.fn(),
    updateOne: jest.fn(),
};

const createLeanQuery = (result) => ({
    select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(result),
    }),
});

const loadUserFavoriteService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/Interaction.js", () => ({
        default: mockInteractionModel,
    }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({
        default: mockTrackModel,
    }));

    const { default: userFavoriteService } = await import(
        "../../src/services/userFavorite/user.favorite.service.js"
    );

    return userFavoriteService;
};

describe("userFavoriteService", () => {
    const userId = "507f1f77bcf86cd799439012";
    const trackId = "507f1f77bcf86cd799439011";

    beforeEach(() => {
        jest.clearAllMocks();

        mockTrackModel.findById.mockReturnValue(createLeanQuery({
            _id: trackId,
        }));
        mockTrackModel.updateOne.mockResolvedValue({
            acknowledged: true,
            modifiedCount: 1,
        });
        mockInteractionModel.findOne.mockReturnValue(createLeanQuery(null));
        mockInteractionModel.create.mockResolvedValue({
            _id: "interaction-1",
        });
        mockInteractionModel.deleteOne.mockResolvedValue({
            deletedCount: 1,
        });
    });

    test("increments totalLike only when a favorite interaction is newly created", async () => {
        const userFavoriteService = await loadUserFavoriteService();

        const result = await userFavoriteService.addTrackToFavorite(userId, trackId);

        expect(mockInteractionModel.create).toHaveBeenCalledWith({
            userId,
            targetType: "Track",
            targetId: trackId,
            action: "like",
        });
        expect(mockTrackModel.updateOne).toHaveBeenCalledWith(
            { _id: trackId },
            {
                $inc: {
                    "stats.totalLike": 1,
                },
            }
        );
        expect(result).toEqual({
            isFavorite: true,
        });
    });

    test("does not create or increment again when the track is already favorited", async () => {
        mockInteractionModel.findOne.mockReturnValue(createLeanQuery({
            _id: "interaction-1",
        }));

        const userFavoriteService = await loadUserFavoriteService();

        const result = await userFavoriteService.addTrackToFavorite(userId, trackId);

        expect(mockInteractionModel.create).not.toHaveBeenCalled();
        expect(mockTrackModel.updateOne).not.toHaveBeenCalled();
        expect(result).toEqual({
            isFavorite: true,
        });
    });

    test("does not increment totalLike when create hits the unique favorite constraint", async () => {
        mockInteractionModel.create.mockRejectedValue({
            code: 11000,
        });

        const userFavoriteService = await loadUserFavoriteService();

        const result = await userFavoriteService.addTrackToFavorite(userId, trackId);

        expect(mockTrackModel.updateOne).not.toHaveBeenCalled();
        expect(result).toEqual({
            isFavorite: true,
        });
    });

    test("decrements totalLike only when a favorite interaction is actually removed", async () => {
        const userFavoriteService = await loadUserFavoriteService();

        const result = await userFavoriteService.removeTrackFromFavorite(userId, trackId);

        expect(mockInteractionModel.deleteOne).toHaveBeenCalledWith({
            userId,
            targetType: "Track",
            targetId: trackId,
            action: "like",
        });
        expect(mockTrackModel.updateOne).toHaveBeenCalledWith(
            {
                _id: trackId,
                "stats.totalLike": { $gt: 0 },
            },
            {
                $inc: {
                    "stats.totalLike": -1,
                },
            }
        );
        expect(result).toEqual({
            isFavorite: false,
        });
    });

    test("does not decrement totalLike when there is no favorite interaction to remove", async () => {
        mockInteractionModel.deleteOne.mockResolvedValue({
            deletedCount: 0,
        });

        const userFavoriteService = await loadUserFavoriteService();

        const result = await userFavoriteService.removeTrackFromFavorite(userId, trackId);

        expect(mockTrackModel.updateOne).not.toHaveBeenCalled();
        expect(result).toEqual({
            isFavorite: false,
        });
    });

    test("returns favorite status based on the existing interaction", async () => {
        mockInteractionModel.findOne.mockReturnValue(createLeanQuery({
            _id: "interaction-1",
        }));

        const userFavoriteService = await loadUserFavoriteService();

        const result = await userFavoriteService.getTrackFavoriteStatus(userId, trackId);

        expect(result).toEqual({
            isFavorite: true,
        });
    });
});
