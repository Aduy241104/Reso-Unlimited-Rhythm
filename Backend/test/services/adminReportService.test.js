import { jest } from "@jest/globals";

const mockReportConstructor = jest.fn(function (reportData) {
    Object.assign(this, reportData);
    this.save = jest.fn().mockResolvedValue({ _id: "report-new", ...reportData });
});

mockReportConstructor.countDocuments = jest.fn();
mockReportConstructor.find = jest.fn();
mockReportConstructor.findById = jest.fn();
mockReportConstructor.findByIdAndUpdate = jest.fn();

const loadAdminReportService = async () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.unstable_mockModule("../../src/models/Report.js", () => ({
        default: mockReportConstructor,
    }));

    const { default: adminReportService } = await import(
        "../../src/services/admin/admin.report.service.js"
    );
    return adminReportService;
};

describe("adminReportService", () => {
    let adminReportService;

    beforeEach(async () => {
        // Mock chainable query methods for find()
        mockReportConstructor.find.mockReturnValue({
            populate: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        sort: jest.fn().mockResolvedValue([
                            { _id: "report-1", status: "pending", targetType: "track" },
                            { _id: "report-2", status: "resolved", targetType: "album" }
                        ])
                    })
                })
            })
        });

        // Mock chainable query methods for findById()
        mockReportConstructor.findById.mockReturnValue({
            populate: jest.fn().mockResolvedValue({ _id: "report-1", status: "pending" })
        });

        adminReportService = await loadAdminReportService();
    });

    describe("getReports (View report list & Filter reports)", () => {
        test("should return default pagination when no query provided", async () => {
            mockReportConstructor.countDocuments.mockResolvedValue(25);

            const result = await adminReportService.getReports({});

            expect(mockReportConstructor.countDocuments).toHaveBeenCalledWith({});
            expect(mockReportConstructor.find).toHaveBeenCalledWith({});
            expect(result.meta).toEqual({
                page: 1,
                limit: 20,
                total: 25,
                totalPages: 2
            });
            expect(result.reports.length).toBe(2);
        });

        test("should apply filters for status and targetType", async () => {
            mockReportConstructor.countDocuments.mockResolvedValue(5);
            mockReportConstructor.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    skip: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            sort: jest.fn().mockResolvedValue([
                                { _id: "report-1", status: "pending", targetType: "track" }
                            ])
                        })
                    })
                })
            });

            const query = { status: "pending", targetType: "track", page: "2", limit: "10" };
            const result = await adminReportService.getReports(query);

            const expectedFilter = { status: "pending", targetType: "track" };
            expect(mockReportConstructor.countDocuments).toHaveBeenCalledWith(expectedFilter);
            expect(mockReportConstructor.find).toHaveBeenCalledWith(expectedFilter);
            
            expect(result.meta.page).toBe(2);
            expect(result.meta.limit).toBe(10);
            expect(result.meta.totalPages).toBe(1);
        });

        test("should apply search query filter (Filter reports)", async () => {
            mockReportConstructor.countDocuments.mockResolvedValue(1);

            await adminReportService.getReports({ q: "spam" });

            const expectedFilter = {
                $or: [
                    { reason: new RegExp("spam", "i") },
                    { description: new RegExp("spam", "i") }
                ]
            };
            expect(mockReportConstructor.find).toHaveBeenCalledWith(expectedFilter);
        });
    });

    describe("getReportDetail (View report details)", () => {
        test("should return report details when valid ID is provided", async () => {
            const result = await adminReportService.getReportDetail("report-1");

            expect(mockReportConstructor.findById).toHaveBeenCalledWith("report-1");
            expect(result).toEqual({ _id: "report-1", status: "pending" });
        });

        test("should return null if report does not exist", async () => {
            mockReportConstructor.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            });

            const result = await adminReportService.getReportDetail("invalid-id");
            expect(result).toBeNull();
        });
    });

    describe("updateReportStatus (Update report status)", () => {
        test("should update report status successfully", async () => {
            mockReportConstructor.findByIdAndUpdate.mockResolvedValue({
                _id: "report-1",
                status: "resolved"
            });

            const result = await adminReportService.updateReportStatus("report-1", "resolved");

            expect(mockReportConstructor.findByIdAndUpdate).toHaveBeenCalledWith(
                "report-1",
                { status: "resolved" },
                { new: true }
            );
            expect(result.status).toBe("resolved");
        });

        test("should throw error if update returns null", async () => {
            mockReportConstructor.findByIdAndUpdate.mockResolvedValue(null);

            await expect(adminReportService.updateReportStatus("invalid-id", "resolved"))
                .rejects
                .toThrow("Report not found");
        });
    });

    describe("handleReport (Handle report)", () => {
        test("should update status and take action on target", async () => {
            mockReportConstructor.findByIdAndUpdate.mockResolvedValue({
                _id: "report-1",
                status: "resolved",
                adminNotes: "Target removed due to violation",
                actionTaken: "remove_target"
            });

            const actionData = {
                action: "remove_target",
                adminNotes: "Target removed due to violation"
            };

            const result = await adminReportService.handleReport("report-1", actionData);

            expect(mockReportConstructor.findByIdAndUpdate).toHaveBeenCalledWith(
                "report-1",
                { 
                    status: "resolved", 
                    adminNotes: actionData.adminNotes,
                    actionTaken: actionData.action 
                },
                { new: true }
            );
            expect(result.actionTaken).toBe("remove_target");
            expect(result.status).toBe("resolved");
        });
    });
});
