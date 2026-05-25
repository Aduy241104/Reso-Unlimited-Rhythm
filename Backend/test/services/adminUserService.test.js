import { jest } from "@jest/globals";

const mockUserModel = {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
};

const createFindChain = (result) => {
    const chain = {
        select: jest.fn(),
        skip: jest.fn(),
        limit: jest.fn(),
        sort: jest.fn(),
    };

    chain.select.mockReturnValue(chain);
    chain.skip.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.sort.mockResolvedValue(result);

    return chain;
};

const createSelectPromise = (result) => ({
    select: jest.fn().mockResolvedValue(result),
});

const loadAdminUserService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: mockUserModel,
    }));

    const { default: adminUserService } = await import(
        "../../src/services/user/admin.user.service.js"
    );

    return adminUserService;
};

describe("adminUserService.getUsers", () => {
    let adminUserService;

    beforeEach(async () => {
        jest.clearAllMocks();
        adminUserService = await loadAdminUserService();
    });

    test("uses default pagination and no filters when query is empty", async () => {
        const users = [{ _id: "u1", email: "a@example.com" }];
        const findChain = createFindChain(users);

        mockUserModel.countDocuments.mockResolvedValue(1);
        mockUserModel.find.mockReturnValue(findChain);

        const result = await adminUserService.getUsers({});

        expect(mockUserModel.countDocuments).toHaveBeenCalledWith({});
        expect(mockUserModel.find).toHaveBeenCalledWith({});
        expect(findChain.select).toHaveBeenCalledWith("-password");
        expect(findChain.skip).toHaveBeenCalledWith(0);
        expect(findChain.limit).toHaveBeenCalledWith(20);
        expect(findChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(result).toEqual({
            users,
            meta: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
            },
        });
    });

    test("applies search, role, activeStatus and custom pagination", async () => {
        const users = [{ _id: "u2", email: "john@example.com" }];
        const findChain = createFindChain(users);

        mockUserModel.countDocuments.mockResolvedValue(25);
        mockUserModel.find.mockReturnValue(findChain);

        const query = {
            page: "2",
            limit: "10",
            q: "john",
            role: "admin",
            activeStatus: "active",
        };

        const result = await adminUserService.getUsers(query);

        expect(mockUserModel.countDocuments).toHaveBeenCalledTimes(1);
        const filterArg = mockUserModel.countDocuments.mock.calls[0][0];

        expect(filterArg.role).toBe("admin");
        expect(filterArg.activeStatus).toBe("active");
        expect(filterArg.$or).toHaveLength(2);
        expect(filterArg.$or[0]).toHaveProperty("email");
        expect(Object.keys(filterArg.$or[1])).toContain("profile.fullName");

        expect(findChain.skip).toHaveBeenCalledWith(10);
        expect(findChain.limit).toHaveBeenCalledWith(10);
        expect(result.meta).toEqual({
            page: 2,
            limit: 10,
            total: 25,
            totalPages: 3,
        });
    });

    test("falls back to safe pagination when invalid values are provided", async () => {
        const users = [{ _id: "u3", email: "min@example.com" }];
        const findChain = createFindChain(users);

        mockUserModel.countDocuments.mockResolvedValue(0);
        mockUserModel.find.mockReturnValue(findChain);

        const result = await adminUserService.getUsers({
            page: "-99",
            limit: "0",
        });

        expect(findChain.skip).toHaveBeenCalledWith(0);
        expect(findChain.limit).toHaveBeenCalledWith(20);
        expect(result.meta).toEqual({
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
        });
    });

    test("ignores q when it contains only whitespace", async () => {
        const users = [];
        const findChain = createFindChain(users);

        mockUserModel.countDocuments.mockResolvedValue(0);
        mockUserModel.find.mockReturnValue(findChain);

        await adminUserService.getUsers({
            q: "   ",
            role: "listener",
        });

        expect(mockUserModel.countDocuments).toHaveBeenCalledWith({
            role: "listener",
        });
    });
});

describe("adminUserService.getUserDetail", () => {
    let adminUserService;

    beforeEach(async () => {
        jest.clearAllMocks();
        adminUserService = await loadAdminUserService();
    });

    test("finds user by id and excludes password", async () => {
        const user = { _id: "u1", email: "a@example.com" };
        const findByIdChain = createSelectPromise(user);

        mockUserModel.findById.mockReturnValue(findByIdChain);

        const result = await adminUserService.getUserDetail("u1");

        expect(mockUserModel.findById).toHaveBeenCalledWith("u1");
        expect(findByIdChain.select).toHaveBeenCalledWith("-password");
        expect(result).toEqual(user);
    });

    test("returns null when user is not found", async () => {
        const findByIdChain = createSelectPromise(null);

        mockUserModel.findById.mockReturnValue(findByIdChain);

        const result = await adminUserService.getUserDetail("missing-id");

        expect(result).toBeNull();
    });
});

describe("adminUserService.updateUser", () => {
    let adminUserService;

    beforeEach(async () => {
        jest.clearAllMocks();
        adminUserService = await loadAdminUserService();
    });

    test("updates role, activeStatus and fullName correctly", async () => {
        const updatedUser = { _id: "u1", role: "admin" };
        const updateChain = createSelectPromise(updatedUser);

        mockUserModel.findByIdAndUpdate.mockReturnValue(updateChain);

        const body = {
            role: "admin",
            activeStatus: "inactive",
            fullName: "John Doe",
        };

        const result = await adminUserService.updateUser("u1", body);

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "u1",
            {
                role: "admin",
                activeStatus: "inactive",
                "profile.fullName": "John Doe",
            },
            { new: true }
        );
        expect(updateChain.select).toHaveBeenCalledWith("-password");
        expect(result).toEqual(updatedUser);
    });

    test("allows updating activeStatus when value is falsey string", async () => {
        const updatedUser = { _id: "u2", activeStatus: "" };
        const updateChain = createSelectPromise(updatedUser);

        mockUserModel.findByIdAndUpdate.mockReturnValue(updateChain);

        await adminUserService.updateUser("u2", {
            activeStatus: "",
        });

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "u2",
            {
                activeStatus: "",
            },
            { new: true }
        );
    });

    test("sends empty updates object when body has no supported fields", async () => {
        const updatedUser = { _id: "u3" };
        const updateChain = createSelectPromise(updatedUser);

        mockUserModel.findByIdAndUpdate.mockReturnValue(updateChain);

        await adminUserService.updateUser("u3", {
            email: "not-supported@example.com",
            randomField: "ignored",
        });

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "u3",
            {},
            { new: true }
        );
    });

    test("does not update fullName when provided as empty string", async () => {
        const updatedUser = { _id: "u4", role: "listener" };
        const updateChain = createSelectPromise(updatedUser);

        mockUserModel.findByIdAndUpdate.mockReturnValue(updateChain);

        await adminUserService.updateUser("u4", {
            role: "listener",
            fullName: "",
        });

        expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "u4",
            { role: "listener" },
            { new: true }
        );
    });
});
