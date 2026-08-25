import mongoose from "mongoose";
import { jest } from "@jest/globals";

const mockUserModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
};

const mockArtistModel = { findOne: jest.fn(), updateOne: jest.fn() };
const mockAlbumModel = { updateMany: jest.fn() };
const mockTrackModel = { updateMany: jest.fn() };
const mockArtistRequestModel = { find: jest.fn() };
const mockAuditLogModel = { find: jest.fn() };
const mockRecordAuditEvent = jest.fn().mockResolvedValue(undefined);

const loadService = async () => {
    jest.resetModules();
    jest.unstable_mockModule("../../src/models/User.js", () => ({ default: mockUserModel }));
    jest.unstable_mockModule("../../src/models/Artist.js", () => ({ default: mockArtistModel }));
    jest.unstable_mockModule("../../src/models/Album.js", () => ({ default: mockAlbumModel }));
    jest.unstable_mockModule("../../src/models/Track.js", () => ({ default: mockTrackModel }));
    jest.unstable_mockModule("../../src/models/ArtistRequest.js", () => ({
        default: mockArtistRequestModel,
    }));
    jest.unstable_mockModule("../../src/models/AuditLog.js", () => ({
        default: mockAuditLogModel,
    }));
    jest.unstable_mockModule("../../src/services/audit/auditLog.service.js", () => ({
        recordAuditEvent: mockRecordAuditEvent,
    }));

    return (await import("../../src/services/user/admin.user.service.js")).default;
};

const queryWith = (value) => {
    const query = {};
    query.select = jest.fn().mockReturnValue(query);
    query.skip = jest.fn().mockReturnValue(query);
    query.limit = jest.fn().mockReturnValue(query);
    query.sort = jest.fn().mockReturnValue(query);
    query.lean = jest.fn().mockReturnValue(query);
    query.then = (resolve, reject) => Promise.resolve(value).then(resolve, reject);
    return query;
};

const user = (id, overrides = {}) => ({
    _id: id,
    email: `${id}@example.com`,
    role: "listener",
    activeStatus: "active",
    profile: { fullName: "John Doe" },
    ...overrides,
});

const validId = () => new mongoose.Types.ObjectId();

beforeEach(() => {
    jest.clearAllMocks();
    mockRecordAuditEvent.mockResolvedValue(undefined);
});

describe("adminUserManageService.getUsers", () => {
    test.each([
        ["TC01", { q: "", page: undefined, limit: 20 }, 1, 20, [user("user-1")]],
        ["TC02", { q: "john", page: 2, limit: 10, role: "admin", activeStatus: "active" }, 2, 10, [user("user-2", { role: "admin" })]],
        ["TC03", { q: "", page: 0, limit: 20 }, 1, 20, []],
        ["TC04", { q: "   ", page: 1, limit: 0, role: "listener", activeStatus: "active" }, 1, 20, []],
    ])(
        "UT-109 - %s - returns the filtered user list",
        async (_caseId, input, expectedPage, expectedLimit, users) => {
            const service = await loadService();
            mockUserModel.countDocuments.mockResolvedValue(users.length);
            mockUserModel.find.mockReturnValue(queryWith(users));

            const result = await service.getUsers(input);

            expect(result.users).toEqual(users);
            expect(result.meta).toEqual({
                page: expectedPage,
                limit: expectedLimit,
                total: users.length,
                totalPages: Math.ceil(users.length / expectedLimit),
            });
            expect(mockUserModel.find).toHaveBeenCalledTimes(1);
            const filter = mockUserModel.find.mock.calls[0][0];
            expect(filter).toEqual(expect.objectContaining({ isDeleted: { $ne: true } }));
            expect(mockUserModel.find.mock.results[0].value.skip).toHaveBeenCalledWith(
                (expectedPage - 1) * expectedLimit
            );
            expect(mockUserModel.find.mock.results[0].value.limit).toHaveBeenCalledWith(
                expectedLimit
            );
            if (input.q?.trim()) {
                expect(filter.$or).toEqual([
                    { email: new RegExp(input.q.trim(), "i") },
                    { "profile.fullName": new RegExp(input.q.trim(), "i") },
                ]);
            }
            if (input.role) expect(filter.role).toBe(input.role);
            if (input.activeStatus) expect(filter.activeStatus).toBe(input.activeStatus);
        }
    );
});

describe("adminUserManageService.updateUser", () => {
    test.each([
        ["TC01", { role: "admin", activeStatus: "inactive", fullName: "John Doe" }],
        ["TC02", { role: "listener", activeStatus: "", fullName: undefined }],
        ["TC03", {}],
        ["TC04", { role: "admin", fullName: "" }],
    ])(
        "UT-110 - %s - returns the updated user",
        async (_caseId, body) => {
            const service = await loadService();
            const targetId = validId();
            const actorAdminId = validId();
            const target = user(targetId.toString(), { role: "listener" });
            const updated = user(targetId.toString(), {
                role: body.role ?? target.role,
                activeStatus: body.activeStatus ?? target.activeStatus,
                profile: { fullName: body.fullName ?? target.profile.fullName },
            });
            mockUserModel.findById.mockResolvedValue(target);
            mockUserModel.findByIdAndUpdate.mockReturnValue(queryWith(updated));

            await expect(service.updateUser(targetId, body, actorAdminId)).resolves.toEqual(updated);
            const expectedSet = {};
            if (typeof body.role !== "undefined") expectedSet.role = body.role;
            if (typeof body.activeStatus !== "undefined") {
                expectedSet.activeStatus = body.activeStatus;
                expectedSet.blockReason = "";
            }
            if (typeof body.fullName !== "undefined") {
                expectedSet["profile.fullName"] = body.fullName;
            }
            expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
                targetId,
                { $set: expectedSet },
                { new: true, runValidators: true }
            );
        }
    );
});

describe("adminUserManageService.getUserDetail", () => {
    test("UT-111 - TC01 - returns user detail without password", async () => {
        const service = await loadService();
        const targetId = validId();
        const expected = user(targetId.toString());
        const detailQuery = queryWith(expected);
        mockUserModel.findById.mockReturnValue(detailQuery);

        await expect(service.getUserDetail(targetId)).resolves.toEqual(expected);
        expect(mockUserModel.findById).toHaveBeenCalledWith(targetId);
        expect(detailQuery.select).toHaveBeenCalledWith("-password");
    });

    test("UT-111 - TC02 - returns null when the user does not exist", async () => {
        const service = await loadService();
        const targetId = validId();
        mockUserModel.findById.mockReturnValue(queryWith(null));

        await expect(service.getUserDetail(targetId)).resolves.toBeNull();
        expect(mockUserModel.findById).toHaveBeenCalledWith(targetId);
    });
});
