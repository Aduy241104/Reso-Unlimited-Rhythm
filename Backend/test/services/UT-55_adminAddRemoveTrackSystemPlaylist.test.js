import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockPlaylistModel = {
  findOne: jest.fn(),
};

const mockTrackModel = {
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
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
  jest.unstable_mockModule("../../src/models/Track.js", () => ({
    default: mockTrackModel,
  }));
  jest.unstable_mockModule("../../src/services/Playlist/playlist.service.js", () => ({
    default: mockPlaylistService,
  }));

  return (await import("../../src/services/Playlist/admin.playlist.service.js")).default;
};

describe("Add/Remove Track from system playlist", () => {
  test("adds a track to system playlist", async () => {
    const service = await loadService();
    const playlistId = new mongoose.Types.ObjectId().toString();
    const trackId = new mongoose.Types.ObjectId().toString();

    const mockPlaylistDoc = {
      _id: playlistId,
      type: "system",
      tracks: [],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(true),
    };

    mockPlaylistModel.findOne.mockResolvedValue(mockPlaylistDoc);
    mockTrackModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: trackId, duration: 200 }),
      }),
    });
    mockTrackModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: trackId, duration: 200 }),
      }),
    });
    mockTrackModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: trackId, duration: 200 }]),
      }),
    });
    mockPlaylistService.getPlaylistDetail.mockResolvedValue({
      _id: playlistId,
      tracks: [{ trackId }],
    });

    const result = await service.addTrackToSystemPlaylist(playlistId, trackId);

    expect(mockPlaylistDoc.save).toHaveBeenCalled();
    expect(result._id).toBe(playlistId);
  });

  test("removes a track from system playlist", async () => {
    const service = await loadService();
    const playlistId = new mongoose.Types.ObjectId().toString();
    const trackId = new mongoose.Types.ObjectId().toString();

    const mockPlaylistDoc = {
      _id: playlistId,
      type: "system",
      tracks: [{ trackId: new mongoose.Types.ObjectId(trackId), order: 1 }],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(true),
    };

    mockPlaylistModel.findOne.mockResolvedValue(mockPlaylistDoc);
    mockTrackModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });
    mockPlaylistService.getPlaylistDetail.mockResolvedValue({
      _id: playlistId,
      tracks: [],
    });

    const result = await service.removeTrackFromSystemPlaylist(playlistId, trackId);

    expect(mockPlaylistDoc.save).toHaveBeenCalled();
    expect(result._id).toBe(playlistId);
  });
});
