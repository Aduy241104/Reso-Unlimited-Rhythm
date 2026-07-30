import { jest } from "@jest/globals";

const mockReportConstructor = jest.fn(function (reportData) {
    Object.assign(this, reportData);
    this.save = jest.fn().mockResolvedValue({ _id: "report-1", ...reportData });
});

mockReportConstructor.countDocuments = jest.fn();
mockReportConstructor.find = jest.fn();
mockReportConstructor.findOne = jest.fn();

const loadUserReportService = async () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.unstable_mockModule("../../src/models/Report.js", () => ({
        default: mockReportConstructor,
    }));

    const { default: userReportService } = await import(
        "../../src/services/user/user.report.service.js"
    );
    return userReportService;
};

describe("userReportService", () => {
    let userReportService;

    beforeEach(async () => {
        userReportService = await loadUserReportService();
    });

    describe("createReport", () => {
        test("creates a report with trimmed data and default values", async () => {
            const reportData = {
                targetId: "track-1",
                targetType: "track",
                reason: "  Inappropriate content  ",
                description: "  This track contains offensive lyrics  ",
                images: ["https://example.com/screenshot1.jpg"],
            };

            const result = await userReportService.createReport("user-1", reportData);

            expect(mockReportConstructor).toHaveBeenCalledWith({
                userId: "user-1",
                targetId: "track-1",
                targetType: "track",
                reason: "Inappropriate content",
                description: "This track contains offensive lyrics",
                images: ["https://example.com/screenshot1.jpg"],
            });
            expect(result).toEqual({
                _id: "report-1",
                userId: "user-1",
                targetId: "track-1",
                targetType: "track",
                reason: "Inappropriate content",
                description: "This track contains offensive lyrics",
                images: ["https://example.com/screenshot1.jpg"],
            });
        });

        test("defaults missing description and images", async () => {
            const reportData = {
                targetId: "album-1",
                targetType: "album",
                reason: "Copyright violation",
            };

            const result = await userReportService.createReport("user-2", reportData);

            expect(mockReportConstructor).toHaveBeenCalledWith({
                userId: "user-2",
                targetId: "album-1",
                targetType: "album",
                reason: "Copyright violation",
                description: "",
                images: [],
            });
            expect(result.description).toBe("");
            expect(result.images).toEqual([]);
        });

        test("trims reason and description strings", async () => {
            const reportData = {
                targetId: "artist-1",
                targetType: "artist",
                reason: "   Spam   ",
                description: "   Spamming links   ",
            };

            await userReportService.createReport("user-3", reportData);

            expect(mockReportConstructor).toHaveBeenCalledWith({
                userId: "user-3",
                targetId: "artist-1",
                targetType: "artist",
                reason: "Spam",
                description: "Spamming links",
                images: [],
            });
        });
    });

    describe("getReports", () => {
        const createFindChain = (result) => ({
            select: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(result),
        });

        test("returns paginated reports for a user with default pagination", async () => {
            const mockReports = [
                {
                    _id: "report-1",
                    targetId: "track-1",
                    targetType: "track",
                    reason: "Spam",
                    status: "pending",
                    createdAt: new Date("2026-07-01"),
                },
            ];

            mockReportConstructor.countDocuments.mockResolvedValue(1);
            mockReportConstructor.find.mockReturnValue(createFindChain(mockReports));

            const result = await userReportService.getReports("user-1", {});

            expect(mockReportConstructor.countDocuments).toHaveBeenCalledWith({
                userId: "user-1",
            });
            expect(mockReportConstructor.find).toHaveBeenCalledWith({
                userId: "user-1",
            });
            expect(result).toEqual({
                reports: mockReports,
                meta: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    totalPages: 1,
                },
            });
        });

        test("filters by status and targetType", async () => {
            const mockReports = [];

            mockReportConstructor.countDocuments.mockResolvedValue(0);
            mockReportConstructor.find.mockReturnValue(createFindChain(mockReports));

            await userReportService.getReports("user-1", {
                status: "pending",
                targetType: "track",
            });

            expect(mockReportConstructor.countDocuments).toHaveBeenCalledWith({
                userId: "user-1",
                status: "pending",
                targetType: "track",
            });
            expect(mockReportConstructor.find).toHaveBeenCalledWith({
                userId: "user-1",
                status: "pending",
                targetType: "track",
            });
        });

        test("applies custom pagination", async () => {
            mockReportConstructor.countDocuments.mockResolvedValue(25);
            mockReportConstructor.find.mockReturnValue(createFindChain([]));

            const result = await userReportService.getReports("user-1", {
                page: "3",
                limit: "5",
            });

            expect(result.meta).toEqual({
                page: 3,
                limit: 5,
                total: 25,
                totalPages: 5,
            });
        });

        test("defaults invalid pagination to minimum page and limit", async () => {
            mockReportConstructor.countDocuments.mockResolvedValue(0);
            mockReportConstructor.find.mockReturnValue(createFindChain([]));

            const result = await userReportService.getReports("user-1", {
                page: "-1",
                limit: "0",
            });

            expect(result.meta.page).toBe(1);
            expect(result.meta.limit).toBe(20);
        });
    });

    describe("getReportDetail", () => {
        test("returns report detail for the correct user", async () => {
            const mockReport = {
                _id: "report-1",
                userId: "user-1",
                targetId: "track-1",
                targetType: "track",
                reason: "Spam",
                description: "Spamming content",
                images: [],
                status: "pending",
                createdAt: new Date("2026-07-01"),
            };

            mockReportConstructor.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockReport),
            });

            const result = await userReportService.getReportDetail("user-1", "report-1");

            expect(mockReportConstructor.findOne).toHaveBeenCalledWith({
                _id: "report-1",
                userId: "user-1",
            });
            expect(result).toEqual(mockReport);
        });

        test("returns null when report is not found", async () => {
            mockReportConstructor.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            });

            const result = await userReportService.getReportDetail("user-1", "nonexistent");

            expect(result).toBeNull();
        });

        test("returns null when report belongs to a different user", async () => {
            mockReportConstructor.findOne.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            });

            const result = await userReportService.getReportDetail("user-999", "report-1");

            expect(mockReportConstructor.findOne).toHaveBeenCalledWith({
                _id: "report-1",
                userId: "user-999",
            });
            expect(result).toBeNull();
        });
    });
});
