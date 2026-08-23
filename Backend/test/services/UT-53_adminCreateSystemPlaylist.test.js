import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockPlaylistModel = {
  create: jest.fn(),
};

const mockPlaylistService = {
  getPlaylistDetail: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Playlist.js", () => ({
    default: mockPlaylistModel,
  }));
  jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/services/Playlist/playlist.service.js", () => ({
    default: mockPlaylistService,
  }));

  return (await import("../../src/services/Playlist/admin.playlist.service.js")).default;
};

describe("Create system playlist - Admin", () => {
  test("creates a new system playlist successfully", async () => {
    const service = await loadService();
    const playlistId = new mongoose.Types.ObjectId().toString();

    mockPlaylistModel.create.mockResolvedValue({
      _id: playlistId,
      title: "Top Hits 2026",
      type: "system",
      toObject: () => ({
        _id: playlistId,
        title: "Top Hits 2026",
        type: "system",
      }),
    });

    mockPlaylistService.getPlaylistDetail.mockResolvedValue({
      _id: playlistId,
      title: "Top Hits 2026",
      type: "system",
    });

    const result = await service.createSystemPlaylist("admin-1", {
      title: "Top Hits 2026",
      description: "Best songs of the year",
    });

    expect(mockPlaylistModel.create).toHaveBeenCalled();
    expect(result.title).toBe("Top Hits 2026");
  });
});
