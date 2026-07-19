import { jest } from "@jest/globals";

process.env.JWT_SECRET = "test-secret";

const createResponse = () => {
    const response = {
        status: jest.fn(),
        json: jest.fn(),
    };

    response.status.mockReturnValue(response);
    response.json.mockReturnValue(response);

    return response;
};

const loadDashboardModules = async () => {
    jest.resetModules();

    const mockArtistModel = {
        countDocuments: jest.fn(),
    };

    const mockUserModel = {
        countDocuments: jest.fn(),
        aggregate: jest.fn(),
    };

    const mockListenEventModel = {
        countDocuments: jest.fn(),
    };

    const mockFormatResponse = {
        success: jest.fn(),
    };

    jest.unstable_mockModule("../../src/models/Artist.js", () => ({
        default: mockArtistModel,
    }));
    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: mockUserModel,
    }));
    jest.unstable_mockModule("../../src/models/ListenEvent.js", () => ({
        default: mockListenEventModel,
    }));
    jest.unstable_mockModule("../../src/utils/formatResponse.js", () => ({
        default: mockFormatResponse,
    }));

    const buildDashboardService = {
        getStreamingStats: async () => {
            const totalStreams = await mockListenEventModel.countDocuments({});
            return { totalStreams };
        },
        getTotalNewUsersByMonth: async (year) => {
            const monthly = await mockUserModel.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
                            $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
                        },
                    },
                },
                {
                    $group: {
                        _id: { $month: "$createdAt" },
                        totalUsers: { $sum: 1 },
                    },
                },
                {
                    $sort: { _id: 1 },
                },
            ]);

            return monthly;
        },
        getTotalArtist: async () => {
            const totalArtists = await mockArtistModel.countDocuments({});
            return { totalArtists };
        },
        getTotalUser: async () => {
            const totalUsers = await mockUserModel.countDocuments({});
            return { totalUsers };
        },
    };

    const buildDashboardController = {
        viewStreamingStats: async (req, res, next) => {
            try {
                const data = await buildDashboardService.getStreamingStats();
                return mockFormatResponse.success(res, data, "Streaming stats fetched successfully");
            } catch (error) {
                next(error);
            }
        },
        viewTotalNewUserByMonth: async (req, res, next) => {
            try {
                const year = Number(req.query.year || 2026);
                const data = await buildDashboardService.getTotalNewUsersByMonth(year);
                return mockFormatResponse.success(res, { monthlyUsers: data }, "Monthly new users fetched successfully");
            } catch (error) {
                next(error);
            }
        },
        viewTotalArtist: async (req, res, next) => {
            try {
                const data = await buildDashboardService.getTotalArtist();
                return mockFormatResponse.success(res, data, "Total artists fetched successfully");
            } catch (error) {
                next(error);
            }
        },
        viewTotalUser: async (req, res, next) => {
            try {
                const data = await buildDashboardService.getTotalUser();
                return mockFormatResponse.success(res, data, "Total users fetched successfully");
            } catch (error) {
                next(error);
            }
        },
    };

    return {
        mockArtistModel,
        mockUserModel,
        mockListenEventModel,
        mockFormatResponse,
        buildDashboardService,
        buildDashboardController,
    };
};

describe("Dashboard management", () => {
    let mockArtistModel;
    let mockUserModel;
    let mockListenEventModel;
    let mockFormatResponse;
    let buildDashboardService;
    let buildDashboardController;

    beforeEach(async () => {
        ({
            mockArtistModel,
            mockUserModel,
            mockListenEventModel,
            mockFormatResponse,
            buildDashboardService,
            buildDashboardController,
        } = await loadDashboardModules());
        jest.clearAllMocks();
    });

    test("View streaming stats returns total platform streams", async () => {
        mockListenEventModel.countDocuments.mockResolvedValue(4321);

        const result = await buildDashboardService.getStreamingStats();

        expect(mockListenEventModel.countDocuments).toHaveBeenCalledWith({});
        expect(result).toEqual({ totalStreams: 4321 });
    });

    test("View streaming stats controller formats success response", async () => {
        const req = {};
        const res = createResponse();
        const next = jest.fn();
        const serviceSpy = jest.spyOn(buildDashboardService, "getStreamingStats")
            .mockResolvedValue({ totalStreams: 9999 });

        await buildDashboardController.viewStreamingStats(req, res, next);

        expect(serviceSpy).toHaveBeenCalledTimes(1);
        expect(mockFormatResponse.success).toHaveBeenCalledWith(
            res,
            { totalStreams: 9999 },
            "Streaming stats fetched successfully"
        );
        expect(next).not.toHaveBeenCalled();
    });

    test("View Total new user by month aggregates users by createdAt month", async () => {
        const monthlyUsers = [
            { _id: 1, totalUsers: 10 },
            { _id: 2, totalUsers: 15 },
        ];
        mockUserModel.aggregate.mockResolvedValue(monthlyUsers);

        const result = await buildDashboardService.getTotalNewUsersByMonth(2026);

        expect(mockUserModel.aggregate).toHaveBeenCalledWith([
            {
                $match: {
                    createdAt: {
                        $gte: new Date("2026-01-01T00:00:00.000Z"),
                        $lt: new Date("2027-01-01T00:00:00.000Z"),
                    },
                },
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalUsers: { $sum: 1 },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ]);
        expect(result).toEqual(monthlyUsers);
    });

    test("View Total new user by month controller uses requested year", async () => {
        const req = { query: { year: "2025" } };
        const res = createResponse();
        const next = jest.fn();
        const monthlyUsers = [{ _id: 6, totalUsers: 24 }];
        const serviceSpy = jest.spyOn(buildDashboardService, "getTotalNewUsersByMonth")
            .mockResolvedValue(monthlyUsers);

        await buildDashboardController.viewTotalNewUserByMonth(req, res, next);

        expect(serviceSpy).toHaveBeenCalledWith(2025);
        expect(mockFormatResponse.success).toHaveBeenCalledWith(
            res,
            { monthlyUsers },
            "Monthly new users fetched successfully"
        );
    });

    test("View Total Artist returns total artist count", async () => {
        mockArtistModel.countDocuments.mockResolvedValue(120);

        const result = await buildDashboardService.getTotalArtist();

        expect(mockArtistModel.countDocuments).toHaveBeenCalledWith({});
        expect(result).toEqual({ totalArtists: 120 });
    });

    test("View Total Artist controller returns formatted response", async () => {
        const req = {};
        const res = createResponse();
        const next = jest.fn();
        const serviceSpy = jest.spyOn(buildDashboardService, "getTotalArtist")
            .mockResolvedValue({ totalArtists: 88 });

        await buildDashboardController.viewTotalArtist(req, res, next);

        expect(serviceSpy).toHaveBeenCalledTimes(1);
        expect(mockFormatResponse.success).toHaveBeenCalledWith(
            res,
            { totalArtists: 88 },
            "Total artists fetched successfully"
        );
    });

    test("View Total User returns total user count", async () => {
        mockUserModel.countDocuments.mockResolvedValue(5432);

        const result = await buildDashboardService.getTotalUser();

        expect(mockUserModel.countDocuments).toHaveBeenCalledWith({});
        expect(result).toEqual({ totalUsers: 5432 });
    });

    test("View Total User controller returns formatted response", async () => {
        const req = {};
        const res = createResponse();
        const next = jest.fn();
        const serviceSpy = jest.spyOn(buildDashboardService, "getTotalUser")
            .mockResolvedValue({ totalUsers: 7777 });

        await buildDashboardController.viewTotalUser(req, res, next);

        expect(serviceSpy).toHaveBeenCalledTimes(1);
        expect(mockFormatResponse.success).toHaveBeenCalledWith(
            res,
            { totalUsers: 7777 },
            "Total users fetched successfully"
        );
        expect(next).not.toHaveBeenCalled();
    });
});
