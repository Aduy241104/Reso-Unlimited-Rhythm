import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockPlaylistService = {
  getPlaylistDetail: jest.fn(),
};

const loadService = async () => {
  jest.resetModules();
  jest.clearAllMocks();

  jest.unstable_mockModule("../../src/models/Playlist.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: {} }));
  jest.unstable_mockModule("../../src/services/Playlist/playlist.service.js", () => ({
    default: mockPlaylistService,
  }));

  return (await import("../../src/services/Playlist/admin.playlist.service.js")).default;
};

describe("View System Playlist Detail - Admin", () => {
  test("retrieves detail of a system playlist", async () => {
    const service = await loadService();
    const playlistId = new mongoose.Types.ObjectId().toString();

    mockPlaylistService.getPlaylistDetail.mockResolvedValue({
      _id: playlistId,
      title: "Pop Hits Detail",
      type: "system",
      tracks: [],
    });

    const result = await service.getSystemPlaylistDetailForAdmin(playlistId);

    expect(mockPlaylistService.getPlaylistDetail).toHaveBeenCalledWith(playlistId, {
      mode: "adminSystem",
    });
    expect(result.title).toBe("Pop Hits Detail");
  });
});
