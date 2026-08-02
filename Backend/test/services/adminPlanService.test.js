import { jest } from "@jest/globals";

const mockPlanConstructor = jest.fn(function (planData) {
    Object.assign(this, planData);
    this.save = jest.fn().mockResolvedValue({ _id: "plan-1", ...planData });
});

mockPlanConstructor.countDocuments = jest.fn();
mockPlanConstructor.find = jest.fn();
mockPlanConstructor.findByIdAndUpdate = jest.fn();

const loadAdminPlanService = async () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.unstable_mockModule("../../src/models/Plan.js", () => ({
        default: mockPlanConstructor,
    }));

    const { default: adminPlanService } = await import(
        "../../src/services/plan/admin.plan.service.js"
    );
    return adminPlanService;
};

describe("adminPlanService", () => {
    let adminPlanService;

    beforeEach(async () => {
        adminPlanService = await loadAdminPlanService();
    });

    describe("getPlans", () => {
        const createFindChain = (result) => ({
            select: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(result),
        });

        test("returns paginated plans with default pagination", async () => {
            const mockPlans = [
                {
                    _id: "plan-1",
                    name: "Premium",
                    price: 59000,
                    durationDays: 30,
                    status: "active",
                },
            ];

            mockPlanConstructor.countDocuments.mockResolvedValue(1);
            mockPlanConstructor.find.mockReturnValue(createFindChain(mockPlans));

            const result = await adminPlanService.getPlans({});

            expect(mockPlanConstructor.countDocuments).toHaveBeenCalledWith({});
            expect(mockPlanConstructor.find).toHaveBeenCalledWith({});
            expect(result).toEqual({
                plans: mockPlans,
                meta: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    totalPages: 1,
                },
            });
        });

        test("filters by status and custom pagination", async () => {
            const mockPlans = [
                { _id: "plan-2", name: "Basic", price: 29000, status: "inactive" },
            ];

            mockPlanConstructor.countDocuments.mockResolvedValue(15);
            mockPlanConstructor.find.mockReturnValue(createFindChain(mockPlans));

            const result = await adminPlanService.getPlans({
                page: "2",
                limit: "5",
                status: "inactive",
            });

            expect(mockPlanConstructor.countDocuments).toHaveBeenCalledWith({
                status: "inactive",
            });
            expect(mockPlanConstructor.find).toHaveBeenCalledWith({
                status: "inactive",
            });
            expect(result.meta).toEqual({
                page: 2,
                limit: 5,
                total: 15,
                totalPages: 3,
            });
        });

        test("filters by search query on name", async () => {
            const mockPlans = [];

            mockPlanConstructor.countDocuments.mockResolvedValue(0);
            mockPlanConstructor.find.mockReturnValue(createFindChain(mockPlans));

            await adminPlanService.getPlans({ q: "premium" });

            const filterArg = mockPlanConstructor.countDocuments.mock.calls[0][0];
            expect(filterArg.name).toEqual(expect.any(RegExp));
        });

        test("defaults invalid pagination values to minimum page and limit", async () => {
            mockPlanConstructor.countDocuments.mockResolvedValue(0);
            mockPlanConstructor.find.mockReturnValue(createFindChain([]));

            const result = await adminPlanService.getPlans({
                page: "0",
                limit: "0",
            });

            expect(result.meta.page).toBe(1);
            expect(result.meta.limit).toBe(20);
        });

        test("ignores empty search query", async () => {
            mockPlanConstructor.countDocuments.mockResolvedValue(0);
            mockPlanConstructor.find.mockReturnValue(createFindChain([]));

            await adminPlanService.getPlans({ q: "   " });

            expect(mockPlanConstructor.countDocuments).toHaveBeenCalledWith({});
        });
    });

    describe("createPlan", () => {
        test("creates a plan with trimmed data and default status active", async () => {
            const payload = {
                name: "  Premium Plus  ",
                price: 99000,
                durationDays: 30,
                description: "  Full access plan  ",
                features: ["NO_ADS", "HIGH_QUALITY_AUDIO"],
            };

            const result = await adminPlanService.createPlan(payload);

            expect(mockPlanConstructor).toHaveBeenCalledWith({
                name: "Premium Plus",
                price: 99000,
                durationDays: 30,
                description: "Full access plan",
                features: ["NO_ADS", "HIGH_QUALITY_AUDIO"],
                status: "active",
            });
            expect(result).toEqual({
                _id: "plan-1",
                name: "Premium Plus",
                price: 99000,
                durationDays: 30,
                description: "Full access plan",
                features: ["NO_ADS", "HIGH_QUALITY_AUDIO"],
                status: "active",
            });
        });

        test("preserves explicit status value", async () => {
            const payload = {
                name: "Trial",
                price: 0,
                durationDays: 7,
                status: "inactive",
            };

            const result = await adminPlanService.createPlan(payload);

            expect(mockPlanConstructor).toHaveBeenCalledWith({
                name: "Trial",
                price: 0,
                durationDays: 7,
                description: "",
                features: [],
                status: "inactive",
            });
            expect(result.status).toBe("inactive");
        });

        test("defaults missing description and features", async () => {
            const payload = {
                name: "Basic",
                price: 29000,
                durationDays: 30,
            };

            const result = await adminPlanService.createPlan(payload);

            expect(mockPlanConstructor).toHaveBeenCalledWith({
                name: "Basic",
                price: 29000,
                durationDays: 30,
                description: "",
                features: [],
                status: "active",
            });
            expect(result.description).toBe("");
            expect(result.features).toEqual([]);
        });
    });

    describe("updatePlan", () => {
        test("updates only provided fields and trims string values", async () => {
            const updatedPlan = {
                _id: "plan-1",
                name: "Premium Pro",
                price: 129000,
                durationDays: 30,
                status: "active",
            };

            mockPlanConstructor.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(updatedPlan),
            });

            const result = await adminPlanService.updatePlan("plan-1", {
                name: "  Premium Pro  ",
                price: 129000,
            });

            expect(mockPlanConstructor.findByIdAndUpdate).toHaveBeenCalledWith(
                "plan-1",
                {
                    name: "Premium Pro",
                    price: 129000,
                },
                { new: true }
            );
            expect(result).toEqual(updatedPlan);
        });

        test("updates features and status when provided", async () => {
            const updatedPlan = {
                _id: "plan-2",
                name: "Basic",
                features: ["NO_ADS"],
                status: "inactive",
            };

            mockPlanConstructor.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(updatedPlan),
            });

            const result = await adminPlanService.updatePlan("plan-2", {
                features: ["NO_ADS"],
                status: "inactive",
            });

            expect(mockPlanConstructor.findByIdAndUpdate).toHaveBeenCalledWith(
                "plan-2",
                {
                    features: ["NO_ADS"],
                    status: "inactive",
                },
                { new: true }
            );
            expect(result).toEqual(updatedPlan);
        });

        test("sends empty updates when no supported fields provided", async () => {
            const updatedPlan = { _id: "plan-3" };

            mockPlanConstructor.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(updatedPlan),
            });

            await adminPlanService.updatePlan("plan-3", {
                randomField: "ignored",
            });

            expect(mockPlanConstructor.findByIdAndUpdate).toHaveBeenCalledWith(
                "plan-3",
                {},
                { new: true }
            );
        });

        test("updates description to empty when explicitly set", async () => {
            const updatedPlan = { _id: "plan-4", description: "" };

            mockPlanConstructor.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(updatedPlan),
            });

            await adminPlanService.updatePlan("plan-4", {
                description: "",
            });

            expect(mockPlanConstructor.findByIdAndUpdate).toHaveBeenCalledWith(
                "plan-4",
                { description: "" },
                { new: true }
            );
        });
    });

    describe("hidePlan", () => {
        test("sets plan status to inactive", async () => {
            const hiddenPlan = {
                _id: "plan-1",
                name: "Premium",
                status: "inactive",
            };

            mockPlanConstructor.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(hiddenPlan),
            });

            const result = await adminPlanService.hidePlan("plan-1");

            expect(mockPlanConstructor.findByIdAndUpdate).toHaveBeenCalledWith(
                "plan-1",
                { status: "inactive" },
                { new: true }
            );
            expect(result).toEqual(hiddenPlan);
            expect(result.status).toBe("inactive");
        });

        test("returns null when plan is not found", async () => {
            mockPlanConstructor.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });

            const result = await adminPlanService.hidePlan("nonexistent-id");

            expect(result).toBeNull();
        });
    });
});
