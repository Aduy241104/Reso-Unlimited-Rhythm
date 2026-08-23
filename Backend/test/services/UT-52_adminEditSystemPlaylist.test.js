import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockPlaylistModel = {
  findOne: jest.fn(),
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

describe("Edit System playlist", () => {
  test("updates metadata of a system playlist", async () => {
    const service = await loadService();
    const playlistId = new mongoose.Types.ObjectId().toString();

    const mockPlaylistDoc = {
      _id: playlistId,
      title: "Old Title",
      description: "Old Description",
      isPublic: true,
      save: jest.fn().mockResolvedValue(true),
    };

    mockPlaylistModel.findOne.mockResolvedValue(mockPlaylistDoc);
    mockPlaylistService.getPlaylistDetail.mockResolvedValue({
      _id: playlistId,
      title: "Updated Title",
      description: "Updated Description",
    });

    const result = await service.updateSystemPlaylist(playlistId, {
      title: "Updated Title",
      description: "Updated Description",
    });

    expect(mockPlaylistDoc.save).toHaveBeenCalled();
    expect(result.title).toBe("Updated Title");
  });
});
