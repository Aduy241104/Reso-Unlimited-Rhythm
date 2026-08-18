import { jest } from "@jest/globals";

const mockPlanModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
};

const mockSubscriptionModel = {
    updateMany: jest.fn(),
};

const mockTransactionModel = {
    updateMany: jest.fn(),
};

const loadAdminSubscriptionService = async () => {
    jest.resetModules();

    jest.unstable_mockModule(
        "../../src/models/Plan.js",
        () => ({ default: mockPlanModel })
    );
    jest.unstable_mockModule(
        "../../src/models/Subscription.js",
        () => ({ default: mockSubscriptionModel })
    );
    jest.unstable_mockModule(
        "../../src/models/Transaction.js",
        () => ({ default: mockTransactionModel })
    );

    const { default: adminSubscriptionService } = await import(
        "../../src/services/subscription/admin.subscription.service.js"
    );

    return adminSubscriptionService;
};

describe("adminSubscriptionService pending payment cancellation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPlanModel.findOne.mockResolvedValue(null);
        mockPlanModel.create.mockResolvedValue({
            _id: "507f1f77bcf86cd799439099",
            name: "Premium Monthly",
        });
        mockTransactionModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
        mockSubscriptionModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
        mockPlanModel.deleteOne.mockResolvedValue({ deletedCount: 1 });
    });

    test("cancels all pending orders when a plan is changed to inactive", async () => {
        const service = await loadAdminSubscriptionService();
        const planId = "507f1f77bcf86cd799439012";
        const plan = { _id: planId, status: "inactive" };
        mockPlanModel.findByIdAndUpdate.mockResolvedValue(plan);

        await service.updatePlan(planId, { status: "inactive" });

        expect(mockTransactionModel.updateMany).toHaveBeenCalledWith(
            { planId, status: "pending" },
            {
                $set: expect.objectContaining({
                    status: "failed",
                    failureReason: expect.stringContaining("disabled by an administrator"),
                    paymentUrl: "",
                }),
            }
        );
        expect(mockSubscriptionModel.updateMany).toHaveBeenCalledWith(
            { planId, status: "pending" },
            { $set: { status: "cancelled" } }
        );
    });

    test("does not cancel pending orders for a regular plan edit", async () => {
        const service = await loadAdminSubscriptionService();
        const planId = "507f1f77bcf86cd799439012";
        mockPlanModel.findByIdAndUpdate.mockResolvedValue({
            _id: planId,
            status: "active",
        });

        await service.updatePlan(planId, { name: "Updated Premium" });

        expect(mockTransactionModel.updateMany).not.toHaveBeenCalled();
        expect(mockSubscriptionModel.updateMany).not.toHaveBeenCalled();
    });

    test("rejects when creating a plan with a duplicate name", async () => {
        const service = await loadAdminSubscriptionService();
        mockPlanModel.findOne.mockResolvedValue({
            _id: "507f1f77bcf86cd799439088",
            name: "Premium Monthly",
        });

        await expect(
            service.createPlan({
                name: " premium monthly ",
                price: 59000,
                durationDays: 30,
                description: "",
                features: [],
                status: "active",
            })
        ).rejects.toThrow("Tên gói đăng ký đã tồn tại.");

        expect(mockPlanModel.create).not.toHaveBeenCalled();
    });

    test("rejects when updating a plan to another plan's duplicate name", async () => {
        const service = await loadAdminSubscriptionService();
        const planId = "507f1f77bcf86cd799439012";
        mockPlanModel.findOne.mockResolvedValue({
            _id: "507f1f77bcf86cd799439013",
            name: "Premium Monthly",
        });

        await expect(
            service.updatePlan(planId, { name: "PREMIUM MONTHLY" })
        ).rejects.toThrow("Tên gói đăng ký đã tồn tại.");

        expect(mockPlanModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test("cancels pending orders before permanently deleting a plan", async () => {
        const service = await loadAdminSubscriptionService();
        const planId = "507f1f77bcf86cd799439012";
        mockPlanModel.findByIdAndUpdate.mockResolvedValue({
            _id: planId,
            status: "inactive",
        });

        await service.deletePlan(planId);

        expect(mockTransactionModel.updateMany).toHaveBeenCalledWith(
            { planId, status: "pending" },
            expect.objectContaining({ $set: expect.any(Object) })
        );
        expect(mockSubscriptionModel.updateMany).toHaveBeenCalledWith(
            { planId, status: "pending" },
            { $set: { status: "cancelled" } }
        );
        expect(mockPlanModel.deleteOne).toHaveBeenCalledWith({ _id: planId });
    });
});
