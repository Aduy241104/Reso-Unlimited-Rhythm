import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockUserModel = {
    findById: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
};

const mockArtistModel = { findOne: jest.fn(), updateOne: jest.fn() };
const mockAlbumModel = { updateMany: jest.fn() };
const mockTrackModel = { updateMany: jest.fn() };

const loadService = async () => {
    jest.resetModules();
    jest.unstable_mockModule("../../src/models/User.js", () => ({ default: mockUserModel }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: mockArtistModel }));
    jest.unstable_mockModule("../../src/models/Album.js", () => ({ default: mockAlbumModel }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: mockTrackModel }));
    return (await import("../../src/services/user/admin.user.service.js")).default;
};

const id = () => new mongoose.Types.ObjectId();

const setupUpdateResult = (user) => {
    mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
    });
};

describe("admin user security", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("rejects self-block", async () => {
        const service = await loadService();
        const adminId = id();
        mockUserModel.findById.mockResolvedValue({
            _id: adminId,
            role: "admin",
            activeStatus: "active",
        });

        await expect(service.updateUser(adminId, { activeStatus: "blocked" }, adminId))
            .rejects.toMatchObject({ statusCode: 403 });
        expect(mockUserModel.countDocuments).not.toHaveBeenCalled();
    });

    test("rejects self-demotion", async () => {
        const service = await loadService();
        const adminId = id();
        mockUserModel.findById.mockResolvedValue({
            _id: adminId,
            role: "admin",
            activeStatus: "active",
        });

        await expect(service.updateUser(adminId, { role: "user" }, adminId))
            .rejects.toMatchObject({ statusCode: 403 });
    });

    test("protects the last active admin from disable/demotion", async () => {
        const service = await loadService();
        const targetId = id();
        mockUserModel.findById.mockResolvedValue({
            _id: targetId,
            role: "admin",
            activeStatus: "active",
        });
        mockUserModel.countDocuments.mockResolvedValue(1);

        await expect(service.updateUser(targetId, { activeStatus: "inactive" }, id()))
            .rejects.toMatchObject({ statusCode: 409 });
        expect(mockUserModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test("allows changing a non-last admin with an explicit whitelist field", async () => {
        const service = await loadService();
        const targetId = id();
        const updated = { _id: targetId, role: "user", activeStatus: "active" };
        mockUserModel.findById.mockResolvedValue({
            _id: targetId,
            role: "admin",
            activeStatus: "active",
        });
        mockUserModel.countDocuments.mockResolvedValue(2);
        setupUpdateResult(updated);

        await expect(service.updateUser(targetId, { role: "user" }, id()))
            .resolves.toEqual(updated);
        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
            targetId,
            { $set: { role: "user" } },
            expect.objectContaining({ runValidators: true })
        );
    });
});
