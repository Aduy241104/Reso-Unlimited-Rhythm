import { jest } from "@jest/globals";

const mockTransactionModel = {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
};

const mockUserModel = {
    find: jest.fn(),
};

const mockMongoose = {
    Types: {
        ObjectId: {
            isValid: jest.fn(),
        },
    },
};

const mockTransactionHelpers = {
    buildPagination: jest.fn(),
    escapeRegex: jest.fn(),
    formatTransactionDetail: jest.fn(),
    formatTransactionListItem: jest.fn(),
    validateTransactionListQuery: jest.fn(),
};

const createObjectId = (value) => ({
    toString: () => value,
});

const createTransactionListQuery = (resolvedValue) => ({
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
});

const createUserQuery = (resolvedValue) => ({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
});

const createTransactionDetailQuery = (resolvedValue) => ({
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
});

const createTransaction = (overrides = {}) => ({
    _id: createObjectId("68761a10a123456789100001"),
    invoiceNumber: "INV-0001",
    totalAmount: 99000,
    currency: "VND",
    paymentMethod: "vnpay",
    status: "success",
    paidAt: new Date("2026-07-01T10:00:00.000Z"),
    createdAt: new Date("2026-06-30T09:00:00.000Z"),
    userId: {
        _id: createObjectId("68761a10a123456789200001"),
        email: "listener@example.com",
    },
    planId: {
        _id: createObjectId("68761a10a123456789300001"),
        name: "Premium 30 Days",
    },
    ...overrides,
});

const createTransactionDetail = (overrides = {}) => ({
    _id: createObjectId("68761a10a123456789100001"),
    userId: {
        _id: createObjectId("68761a10a123456789200001"),
        email: "listener@example.com",
        avatar: "avatar.jpg",
        profile: {
            fullName: "Sky Bloom",
            country: "VN",
            gender: "female",
        },
    },
    subscriptionId: {
        _id: createObjectId("68761a10a123456789400001"),
        status: "active",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-07-31T00:00:00.000Z"),
    },
    planId: {
        _id: createObjectId("68761a10a123456789300001"),
        name: "Premium 30 Days",
        price: 99000,
        durationDays: 30,
    },
    amount: 90000,
    tax: 9000,
    totalAmount: 99000,
    currency: "VND",
    paymentMethod: "vnpay",
    paymentGateway: "vnpay",
    gatewayTransactionId: "GATEWAY-001",
    status: "success",
    paidAt: new Date("2026-07-01T10:00:00.000Z"),
    failedAt: null,
    failureReason: "",
    invoiceNumber: "INV-0001",
    createdAt: new Date("2026-06-30T09:00:00.000Z"),
    updatedAt: new Date("2026-07-01T10:05:00.000Z"),
    ...overrides,
});

const loadAdminTransactionService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("mongoose", () => ({
        default: mockMongoose,
    }));

    jest.unstable_mockModule("../../src/models/Transaction.js", () => ({
        default: mockTransactionModel,
    }));

    jest.unstable_mockModule("../../src/models/User.js", () => ({
        default: mockUserModel,
    }));

    jest.unstable_mockModule(
        "../../src/services/transaction/transaction.service.helper.js",
        () => ({
            buildPagination: mockTransactionHelpers.buildPagination,
            escapeRegex: mockTransactionHelpers.escapeRegex,
            formatTransactionDetail:
                mockTransactionHelpers.formatTransactionDetail,
            formatTransactionListItem:
                mockTransactionHelpers.formatTransactionListItem,
            validateTransactionListQuery:
                mockTransactionHelpers.validateTransactionListQuery,
        })
    );

    const [{ default: adminTransactionService }, { AppError }] =
        await Promise.all([
            import("../../src/services/transaction/admin.transaction.service.js"),
            import("../../src/utils/AppError.js"),
        ]);

    return {
        adminTransactionService,
        AppError,
    };
};

describe("adminTransactionService.getTransactionList", () => {
    let adminTransactionService;
    let AppError;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockTransactionHelpers.validateTransactionListQuery.mockReturnValue({
            page: 1,
            limit: 10,
            search: "",
            status: null,
            paymentMethod: null,
        });
        mockTransactionHelpers.buildPagination.mockImplementation(
            (page, limit, total) => ({
                page,
                limit,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            })
        );
        mockTransactionHelpers.escapeRegex.mockImplementation((value) => value);
        mockTransactionHelpers.formatTransactionListItem.mockImplementation(
            (transaction) => ({
                id: transaction._id.toString(),
                invoiceNumber: transaction.invoiceNumber,
            })
        );

        ({ adminTransactionService, AppError } =
            await loadAdminTransactionService());
    });

    test("returns the transaction list with search, filters, pagination, and formatted items", async () => {
        const userSearchQuery = createUserQuery([
            { _id: "user-1" },
            { _id: "user-2" },
        ]);
        const transactionDocs = [
            createTransaction(),
            createTransaction({
                _id: createObjectId("68761a10a123456789100002"),
                invoiceNumber: "INV-0002",
            }),
        ];
        const transactionQuery = createTransactionListQuery(transactionDocs);

        mockTransactionHelpers.validateTransactionListQuery.mockReturnValue({
            page: 2,
            limit: 5,
            search: "INV.*(2026)",
            status: "success",
            paymentMethod: "vnpay",
        });
        mockTransactionHelpers.escapeRegex.mockReturnValue("INV\\.\\*\\(2026\\)");
        mockUserModel.find.mockReturnValue(userSearchQuery);
        mockTransactionModel.find.mockReturnValue(transactionQuery);
        mockTransactionModel.countDocuments.mockResolvedValue(12);
        mockTransactionHelpers.buildPagination.mockReturnValue({
            page: 2,
            limit: 5,
            total: 12,
            totalPages: 3,
        });

        const result = await adminTransactionService.getTransactionList({
            page: "2",
            limit: "5",
            search: "INV.*(2026)",
            status: "success",
            paymentMethod: "vnpay",
        });

        expect(
            mockTransactionHelpers.validateTransactionListQuery
        ).toHaveBeenCalledWith({
            page: "2",
            limit: "5",
            search: "INV.*(2026)",
            status: "success",
            paymentMethod: "vnpay",
        });
        expect(mockTransactionHelpers.escapeRegex).toHaveBeenCalledWith(
            "INV.*(2026)"
        );
        expect(mockUserModel.find).toHaveBeenCalledWith({
            email: {
                $regex: "INV\\.\\*\\(2026\\)",
                $options: "i",
            },
        });
        expect(userSearchQuery.select).toHaveBeenCalledWith("_id");

        const expectedFilter = {
            status: "success",
            paymentMethod: "vnpay",
            $or: [
                {
                    invoiceNumber: {
                        $regex: "INV\\.\\*\\(2026\\)",
                        $options: "i",
                    },
                },
                {
                    userId: {
                        $in: ["user-1", "user-2"],
                    },
                },
            ],
        };

        expect(mockTransactionModel.find).toHaveBeenCalledWith(expectedFilter);
        expect(transactionQuery.select).toHaveBeenCalledWith(
            "userId planId invoiceNumber totalAmount currency paymentMethod status paidAt createdAt"
        );
        expect(transactionQuery.populate).toHaveBeenNthCalledWith(1, {
            path: "userId",
            select: "_id email",
        });
        expect(transactionQuery.populate).toHaveBeenNthCalledWith(2, {
            path: "planId",
            select: "_id name",
        });
        expect(transactionQuery.sort).toHaveBeenCalledWith({
            createdAt: -1,
        });
        expect(transactionQuery.skip).toHaveBeenCalledWith(5);
        expect(transactionQuery.limit).toHaveBeenCalledWith(5);
        expect(mockTransactionModel.countDocuments).toHaveBeenCalledWith(
            expectedFilter
        );
        expect(
            mockTransactionHelpers.formatTransactionListItem
        ).toHaveBeenNthCalledWith(1, transactionDocs[0], 0, transactionDocs);
        expect(
            mockTransactionHelpers.formatTransactionListItem
        ).toHaveBeenNthCalledWith(2, transactionDocs[1], 1, transactionDocs);
        expect(mockTransactionHelpers.buildPagination).toHaveBeenCalledWith(
            2,
            5,
            12
        );
        expect(result).toEqual({
            transactions: [
                {
                    id: "68761a10a123456789100001",
                    invoiceNumber: "INV-0001",
                },
                {
                    id: "68761a10a123456789100002",
                    invoiceNumber: "INV-0002",
                },
            ],
            pagination: {
                page: 2,
                limit: 5,
                total: 12,
                totalPages: 3,
            },
        });
    });

    test("returns an empty transaction list with the default pagination values when there is no search", async () => {
        const transactionQuery = createTransactionListQuery([]);

        mockTransactionHelpers.validateTransactionListQuery.mockReturnValue({
            page: 1,
            limit: 10,
            search: "",
            status: null,
            paymentMethod: null,
        });
        mockTransactionModel.find.mockReturnValue(transactionQuery);
        mockTransactionModel.countDocuments.mockResolvedValue(0);
        mockTransactionHelpers.buildPagination.mockReturnValue({
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
        });

        const result = await adminTransactionService.getTransactionList();

        expect(mockTransactionHelpers.escapeRegex).not.toHaveBeenCalled();
        expect(mockUserModel.find).not.toHaveBeenCalled();
        expect(mockTransactionModel.find).toHaveBeenCalledWith({});
        expect(transactionQuery.skip).toHaveBeenCalledWith(0);
        expect(transactionQuery.limit).toHaveBeenCalledWith(10);
        expect(mockTransactionHelpers.buildPagination).toHaveBeenCalledWith(
            1,
            10,
            0
        );
        expect(result).toEqual({
            transactions: [],
            pagination: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0,
            },
        });
    });

    test("builds the search filter with an empty matched-user list when no emails match", async () => {
        const userSearchQuery = createUserQuery([]);
        const transactionQuery = createTransactionListQuery([]);

        mockTransactionHelpers.validateTransactionListQuery.mockReturnValue({
            page: 1,
            limit: 50,
            search: "missing@example.com",
            status: "failed",
            paymentMethod: "card",
        });
        mockTransactionHelpers.escapeRegex.mockReturnValue(
            "missing@example\\.com"
        );
        mockUserModel.find.mockReturnValue(userSearchQuery);
        mockTransactionModel.find.mockReturnValue(transactionQuery);
        mockTransactionModel.countDocuments.mockResolvedValue(0);

        await adminTransactionService.getTransactionList({
            search: "missing@example.com",
            status: "failed",
            paymentMethod: "card",
            limit: "100",
        });

        expect(mockTransactionModel.find).toHaveBeenCalledWith({
            status: "failed",
            paymentMethod: "card",
            $or: [
                {
                    invoiceNumber: {
                        $regex: "missing@example\\.com",
                        $options: "i",
                    },
                },
                {
                    userId: {
                        $in: [],
                    },
                },
            ],
        });
        expect(transactionQuery.limit).toHaveBeenCalledWith(50);
    });

    test("propagates query validation errors before any database query runs", async () => {
        const error = new AppError("Invalid status.", 400, {
            field: "status",
            allowedValues: ["pending", "success", "failed", "refunded"],
        });

        mockTransactionHelpers.validateTransactionListQuery.mockImplementation(
            () => {
                throw error;
            }
        );

        await expect(
            adminTransactionService.getTransactionList({
                status: "processing",
            })
        ).rejects.toBe(error);

        expect(mockUserModel.find).not.toHaveBeenCalled();
        expect(mockTransactionModel.find).not.toHaveBeenCalled();
    });

    test("propagates user email lookup failures", async () => {
        const error = new Error("User lookup failed.");
        const userSearchQuery = createUserQuery([]);

        mockTransactionHelpers.validateTransactionListQuery.mockReturnValue({
            page: 1,
            limit: 10,
            search: "listener@example.com",
            status: null,
            paymentMethod: null,
        });
        mockTransactionHelpers.escapeRegex.mockReturnValue(
            "listener@example\\.com"
        );
        userSearchQuery.lean.mockRejectedValue(error);
        mockUserModel.find.mockReturnValue(userSearchQuery);

        await expect(
            adminTransactionService.getTransactionList({
                search: "listener@example.com",
            })
        ).rejects.toBe(error);

        expect(mockTransactionModel.find).not.toHaveBeenCalled();
    });

    test("propagates transaction list query failures", async () => {
        const error = new Error("Transaction list read failed.");
        const transactionQuery = createTransactionListQuery([]);

        transactionQuery.lean.mockRejectedValue(error);
        mockTransactionModel.find.mockReturnValue(transactionQuery);
        mockTransactionModel.countDocuments.mockResolvedValue(2);

        await expect(
            adminTransactionService.getTransactionList()
        ).rejects.toBe(error);
    });

    test("propagates transaction count failures", async () => {
        const error = new Error("Transaction count failed.");
        const transactionQuery = createTransactionListQuery([]);

        mockTransactionModel.find.mockReturnValue(transactionQuery);
        mockTransactionModel.countDocuments.mockRejectedValue(error);

        await expect(
            adminTransactionService.getTransactionList()
        ).rejects.toBe(error);
    });

    test("propagates transaction list formatting failures", async () => {
        const error = new Error("Format list item failed.");
        const transactionDocs = [createTransaction()];
        const transactionQuery = createTransactionListQuery(transactionDocs);

        mockTransactionModel.find.mockReturnValue(transactionQuery);
        mockTransactionModel.countDocuments.mockResolvedValue(1);
        mockTransactionHelpers.formatTransactionListItem.mockImplementation(
            () => {
                throw error;
            }
        );

        await expect(
            adminTransactionService.getTransactionList()
        ).rejects.toBe(error);

        expect(
            mockTransactionHelpers.formatTransactionListItem
        ).toHaveBeenCalledWith(transactionDocs[0], 0, transactionDocs);
    });
});

describe("adminTransactionService.getTransactionDetail", () => {
    let adminTransactionService;
    let AppError;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);
        mockTransactionHelpers.formatTransactionDetail.mockImplementation(
            (transaction) => ({
                id: transaction._id.toString(),
                invoiceNumber: transaction.invoiceNumber,
            })
        );

        ({ adminTransactionService, AppError } =
            await loadAdminTransactionService());
    });

    test("returns the formatted transaction detail with all required populations", async () => {
        const transaction = createTransactionDetail();
        const detailQuery = createTransactionDetailQuery(transaction);

        mockTransactionModel.findById.mockReturnValue(detailQuery);
        mockTransactionHelpers.formatTransactionDetail.mockReturnValue({
            id: "68761a10a123456789100001",
            invoiceNumber: "INV-0001",
            user: {
                id: "68761a10a123456789200001",
                email: "listener@example.com",
            },
        });

        const result = await adminTransactionService.getTransactionDetail(
            "68761a10a123456789100001"
        );

        expect(mockMongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(
            "68761a10a123456789100001"
        );
        expect(mockTransactionModel.findById).toHaveBeenCalledWith(
            "68761a10a123456789100001"
        );
        expect(detailQuery.select).toHaveBeenCalledWith(
            "userId subscriptionId planId amount tax totalAmount currency paymentMethod paymentGateway gatewayTransactionId status paidAt failedAt failureReason invoiceNumber createdAt updatedAt"
        );
        expect(detailQuery.populate).toHaveBeenNthCalledWith(1, {
            path: "userId",
            select: "_id email avatar profile.fullName profile.country profile.gender",
        });
        expect(detailQuery.populate).toHaveBeenNthCalledWith(2, {
            path: "planId",
            select: "_id name price durationDays",
        });
        expect(detailQuery.populate).toHaveBeenNthCalledWith(3, {
            path: "subscriptionId",
            select: "_id status startDate endDate",
        });
        expect(
            mockTransactionHelpers.formatTransactionDetail
        ).toHaveBeenCalledWith(transaction);
        expect(result).toEqual({
            id: "68761a10a123456789100001",
            invoiceNumber: "INV-0001",
            user: {
                id: "68761a10a123456789200001",
                email: "listener@example.com",
            },
        });
    });

    test("throws a 400 AppError when the transaction id is invalid", async () => {
        mockMongoose.Types.ObjectId.isValid.mockReturnValue(false);

        const request = adminTransactionService.getTransactionDetail("invalid-id");

        await expect(request).rejects.toMatchObject({
            message: "Transaction id is invalid.",
            statusCode: 400,
            details: null,
        });
        await expect(request).rejects.toBeInstanceOf(AppError);

        expect(mockTransactionModel.findById).not.toHaveBeenCalled();
    });

    test("throws a 404 AppError when the transaction does not exist", async () => {
        const detailQuery = createTransactionDetailQuery(null);

        mockTransactionModel.findById.mockReturnValue(detailQuery);

        const request = adminTransactionService.getTransactionDetail(
            "68761a10a123456789100099"
        );

        await expect(request).rejects.toMatchObject({
            message: "Transaction not found.",
            statusCode: 404,
            details: null,
        });
        await expect(request).rejects.toBeInstanceOf(AppError);

        expect(
            mockTransactionHelpers.formatTransactionDetail
        ).not.toHaveBeenCalled();
    });

    test("propagates transaction detail query failures", async () => {
        const error = new Error("Transaction detail read failed.");
        const detailQuery = createTransactionDetailQuery(null);

        detailQuery.lean.mockRejectedValue(error);
        mockTransactionModel.findById.mockReturnValue(detailQuery);

        await expect(
            adminTransactionService.getTransactionDetail(
                "68761a10a123456789100001"
            )
        ).rejects.toBe(error);
    });

    test("propagates transaction detail formatting failures", async () => {
        const error = new Error("Format detail failed.");
        const transaction = createTransactionDetail({
            userId: null,
            planId: null,
            subscriptionId: null,
        });
        const detailQuery = createTransactionDetailQuery(transaction);

        mockTransactionModel.findById.mockReturnValue(detailQuery);
        mockTransactionHelpers.formatTransactionDetail.mockImplementation(
            () => {
                throw error;
            }
        );

        await expect(
            adminTransactionService.getTransactionDetail(
                "68761a10a123456789100001"
            )
        ).rejects.toBe(error);

        expect(
            mockTransactionHelpers.formatTransactionDetail
        ).toHaveBeenCalledWith(transaction);
    });
});

