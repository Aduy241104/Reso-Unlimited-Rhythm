import { jest } from "@jest/globals";

const mockPlaylistModel = {
  find: jest.fn(),
  countDocuments: jest.fn(),
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

describe("View System Playlist - Admin", () => {
  test("retrieves list of system playlists", async () => {
    const service = await loadService();

    const mockData = [
      {
        _id: "sys-1",
        title: "Weekly Chart",
        type: "system",
        trackCount: 10,
      },
    ];

    const chainMock = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockData),
    };

    mockPlaylistModel.find.mockReturnValue(chainMock);
    mockPlaylistModel.countDocuments.mockResolvedValue(1);

    const result = await service.getSystemPlaylistsForAdmin({ page: 1, limit: 10 });

    expect(mockPlaylistModel.find).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Weekly Chart");
  });
});
