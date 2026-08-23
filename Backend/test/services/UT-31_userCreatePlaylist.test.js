import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockPlaylistModel = {
  create: jest.fn(),
  countDocuments: jest.fn(),
};

const mockUserModel = {
  findById: jest.fn(),
};

const mockSubscriptionModel = {
  findOne: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Playlist.js", () => ({
    default: mockPlaylistModel,
  }));
  jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/models/User.js", () => ({
    default: mockUserModel,
  }));
  jest.unstable_mockModule("../../src/models/Subscription.js", () => ({
    default: mockSubscriptionModel,
  }));
  jest.unstable_mockModule("../../src/services/cloudinaryService.js", () => ({
    uploadImageBuffer: jest.fn(),
    deleteImageByPublicId: jest.fn(),
  }));

  return (await import("../../src/services/userPlaylist/user.playlist.service.js")).default;
};

describe("Create playlist - User", () => {
  test("creates a new user playlist successfully", async () => {
    const service = await loadService();
    const userId = new mongoose.Types.ObjectId().toString();
    const playlistId = new mongoose.Types.ObjectId().toString();

    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ subscription: {} }),
      }),
    });
    mockSubscriptionModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    mockPlaylistModel.countDocuments.mockResolvedValue(0);
    mockPlaylistModel.create.mockResolvedValue({
      _id: playlistId,
      userId,
      title: "My Favorite Hits",
      description: "Chill beats",
      type: "user",
      isPublic: true,
      tracks: [],
    });

    const result = await service.createMyPlaylistByUserId(userId, {
      title: "My Favorite Hits",
      description: "Chill beats",
    });

    expect(mockPlaylistModel.create).toHaveBeenCalled();
    expect(result.playlistId).toBe(playlistId);
    expect(result.title).toBe("My Favorite Hits");
  });
});
