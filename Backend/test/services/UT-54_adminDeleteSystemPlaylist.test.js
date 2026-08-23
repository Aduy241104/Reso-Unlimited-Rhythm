import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockPlaylistModel = {
  findOne: jest.fn(),
  deleteOne: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Playlist.js", () => ({
    default: mockPlaylistModel,
  }));
  jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/services/Playlist/playlist.service.js", () => ({ default: {} }));

  return (await import("../../src/services/Playlist/admin.playlist.service.js")).default;
};

describe("Delete System playlist", () => {
  test("deletes an existing system playlist", async () => {
    const service = await loadService();
    const playlistId = new mongoose.Types.ObjectId().toString();

    mockPlaylistModel.findOne.mockResolvedValue({
      _id: playlistId,
      type: "system",
      coverImage: "",
    });
    mockPlaylistModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

    await service.deleteSystemPlaylist(playlistId);

    expect(mockPlaylistModel.deleteOne).toHaveBeenCalledWith({ _id: playlistId, type: "system" });
  });
});
