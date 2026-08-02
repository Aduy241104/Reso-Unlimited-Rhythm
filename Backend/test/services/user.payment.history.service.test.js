import { jest } from "@jest/globals";

const mockPaymentHistoryHelper = {
    countPaymentHistoryByUserId: jest.fn(),
    findPaymentDetailByUserId: jest.fn(),
    findPaymentHistoryByUserId: jest.fn(),
};

const mockMongoose = {
    Types: {
        ObjectId: {
            isValid: jest.fn(),
        },
    },
};

const mockPage = {
    getSize: jest.fn(),
    drawText: jest.fn(),
    drawRectangle: jest.fn(),
};

const mockPdfDoc = {
    addPage: jest.fn(),
    embedFont: jest.fn(),
    save: jest.fn(),
};

const mockPdfLib = {
    PDFDocument: {
        create: jest.fn(),
    },
    StandardFonts: {
        Helvetica: "Helvetica",
        HelveticaBold: "HelveticaBold",
    },
    rgb: jest.fn(),
};

const createTransaction = (overrides = {}) => ({
    _id: {
        toString: () => "68761a10a123456789100001",
    },
    amount: 99000,
    tax: 9000,
    totalAmount: 108000,
    currency: "VND",
    paymentMethod: "card",
    paymentGateway: "stripe",
    gatewayTransactionId: "txn_001",
    status: "success",
    paidAt: new Date("2026-07-01T12:00:00.000Z"),
    failedAt: null,
    failureReason: "",
    invoiceNumber: "INV-001",
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
    updatedAt: new Date("2026-07-01T12:30:00.000Z"),
    planId: {
        _id: {
            toString: () => "68761a10a123456789200001",
        },
        name: "Premium 30 Days",
        price: 99000,
        durationDays: 30,
        status: "active",
    },
    subscriptionId: {
        _id: {
            toString: () => "68761a10a123456789300001",
        },
        status: "active",
        startDate: new Date("2026-07-01T00:00:00.000Z"),
        endDate: new Date("2026-07-31T00:00:00.000Z"),
        autoRenew: true,
    },
    ...overrides,
});

const createPayment = (overrides = {}) => ({
    _id: {
        toString: () => "68761a10a123456789400001",
    },
    invoiceNumber: "INV-DETAIL-001",
    gatewayTransactionId: "gateway-detail-001",
    planName: "Premium Annual",
    amount: 149000,
    tax: 10000,
    totalAmount: 159000,
    currency: "VND",
    paymentMethod: "card",
    paymentGateway: "stripe",
    status: "success",
    failureReason: "",
    paidAt: new Date("2026-07-15T12:00:00.000Z"),
    createdAt: new Date("2026-07-15T08:00:00.000Z"),
    updatedAt: new Date("2026-07-15T12:30:00.000Z"),
    planId: {
        _id: {
            toString: () => "68761a10a123456789500001",
        },
        name: "Premium Annual",
        title: "Premium 365",
        price: 149000,
        amount: 149000,
    },
    subscriptionId: {
        _id: {
            toString: () => "68761a10a123456789600001",
        },
        status: "active",
        startDate: new Date("2026-07-15T00:00:00.000Z"),
        endDate: new Date("2027-07-15T00:00:00.000Z"),
        autoRenew: true,
    },
    ...overrides,
});

const getDrawnTexts = () =>
    mockPage.drawText.mock.calls.map(([text]) => text);

const loadPaymentHistoryService = async () => {
    jest.resetModules();

    jest.unstable_mockModule("mongoose", () => ({
        default: mockMongoose,
    }));

    jest.unstable_mockModule("pdf-lib", () => ({
        PDFDocument: mockPdfLib.PDFDocument,
        StandardFonts: mockPdfLib.StandardFonts,
        rgb: mockPdfLib.rgb,
    }));

    jest.unstable_mockModule(
        "../../src/services/userPaymentHistory/user.payment.history.service.helper.js",
        () => ({
            countPaymentHistoryByUserId:
                mockPaymentHistoryHelper.countPaymentHistoryByUserId,
            findPaymentDetailByUserId:
                mockPaymentHistoryHelper.findPaymentDetailByUserId,
            findPaymentHistoryByUserId:
                mockPaymentHistoryHelper.findPaymentHistoryByUserId,
        })
    );

    const [{ default: paymentHistoryService }, { AppError }] =
        await Promise.all([
            import(
                "../../src/services/userPaymentHistory/user.payment.history.service.js"
            ),
            import("../../src/utils/AppError.js"),
        ]);

    return {
        paymentHistoryService,
        AppError,
    };
};

const setupMocks = () => {
    mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);

    mockPaymentHistoryHelper.findPaymentHistoryByUserId.mockResolvedValue(
        []
    );
    mockPaymentHistoryHelper.countPaymentHistoryByUserId.mockResolvedValue(0);
    mockPaymentHistoryHelper.findPaymentDetailByUserId.mockResolvedValue(null);

    mockPage.getSize.mockReturnValue({
        width: 595.28,
        height: 841.89,
    });
    mockPage.drawText.mockReset();
    mockPage.drawRectangle.mockReset();

    mockPdfDoc.addPage.mockReturnValue(mockPage);
    mockPdfDoc.embedFont.mockImplementation(async (fontName) => ({
        fontName,
    }));
    mockPdfDoc.save.mockResolvedValue(Uint8Array.from([1, 2, 3]));

    mockPdfLib.PDFDocument.create.mockResolvedValue(mockPdfDoc);
    mockPdfLib.rgb.mockImplementation((red, green, blue) => ({
        red,
        green,
        blue,
    }));
};

describe("paymentHistoryService.getMyPaymentHistory", () => {
    let paymentHistoryService;
    let AppError;

    beforeEach(async () => {
        jest.clearAllMocks();
        setupMocks();

        ({ paymentHistoryService, AppError } =
            await loadPaymentHistoryService());
    });

    test("returns payment history with default pagination and normalized items", async () => {
        const transactions = [
            createTransaction(),
            createTransaction({
                _id: {
                    toString: () => "68761a10a123456789100002",
                },
                amount: 0,
                tax: 0,
                totalAmount: 0,
                currency: "",
                paymentMethod: "",
                paymentGateway: "",
                gatewayTransactionId: "",
                status: "failed",
                paidAt: null,
                failedAt: new Date("2026-07-02T10:00:00.000Z"),
                failureReason: "Gateway timeout",
                invoiceNumber: "",
                createdAt: null,
                updatedAt: null,
                planId: null,
                subscriptionId: null,
            }),
        ];
        const promiseAllSpy = jest.spyOn(Promise, "all");

        mockPaymentHistoryHelper.findPaymentHistoryByUserId.mockResolvedValue(
            transactions
        );
        mockPaymentHistoryHelper.countPaymentHistoryByUserId.mockResolvedValue(
            2
        );

        const result = await paymentHistoryService.getMyPaymentHistory(
            "68761a10a123456789900001"
        );

        expect(promiseAllSpy).toHaveBeenCalledTimes(1);

        expect(
            mockPaymentHistoryHelper.findPaymentHistoryByUserId
        ).toHaveBeenCalledWith(
            {
                userId: "68761a10a123456789900001",
            },
            {
                skip: 0,
                limit: 10,
            }
        );

        expect(
            mockPaymentHistoryHelper.countPaymentHistoryByUserId
        ).toHaveBeenCalledWith({
            userId: "68761a10a123456789900001",
        });

        expect(result).toEqual({
            items: [
                {
                    id: "68761a10a123456789100001",
                    amount: 99000,
                    tax: 9000,
                    totalAmount: 108000,
                    currency: "VND",
                    paymentMethod: "card",
                    paymentGateway: "stripe",
                    gatewayTransactionId: "txn_001",
                    status: "success",
                    paidAt: transactions[0].paidAt,
                    failedAt: null,
                    failureReason: "",
                    invoiceNumber: "INV-001",
                    createdAt: transactions[0].createdAt,
                    updatedAt: transactions[0].updatedAt,
                    planId: {
                        id: "68761a10a123456789200001",
                        name: "Premium 30 Days",
                        price: 99000,
                        durationDays: 30,
                        status: "active",
                    },
                    subscriptionId: {
                        id: "68761a10a123456789300001",
                        status: "active",
                        startDate: transactions[0].subscriptionId.startDate,
                        endDate: transactions[0].subscriptionId.endDate,
                        autoRenew: true,
                    },
                },
                {
                    id: "68761a10a123456789100002",
                    amount: 0,
                    tax: 0,
                    totalAmount: 0,
                    currency: "VND",
                    paymentMethod: "",
                    paymentGateway: "",
                    gatewayTransactionId: "",
                    status: "failed",
                    paidAt: null,
                    failedAt: transactions[1].failedAt,
                    failureReason: "Gateway timeout",
                    invoiceNumber: "",
                    createdAt: null,
                    updatedAt: null,
                    planId: null,
                    subscriptionId: null,
                },
            ],
            pagination: {
                page: 1,
                limit: 10,
                totalItems: 2,
                totalPages: 1,
            },
        });

        promiseAllSpy.mockRestore();
    });

    test("returns empty payment history when no transactions exist", async () => {
        const result = await paymentHistoryService.getMyPaymentHistory(
            "68761a10a123456789900001"
        );

        expect(result).toEqual({
            items: [],
            pagination: {
                page: 1,
                limit: 10,
                totalItems: 0,
                totalPages: 0,
            },
        });
    });

    test("applies custom page, limit, filters, and skip calculation", async () => {
        mockPaymentHistoryHelper.countPaymentHistoryByUserId.mockResolvedValue(
            11
        );

        const result = await paymentHistoryService.getMyPaymentHistory(
            "68761a10a123456789900001",
            {
                page: "3",
                limit: "4",
                status: " Success ",
                paymentGateway: " Stripe ",
                paymentMethod: " Card ",
            }
        );

        expect(
            mockPaymentHistoryHelper.findPaymentHistoryByUserId
        ).toHaveBeenCalledWith(
            {
                userId: "68761a10a123456789900001",
                status: "success",
                paymentGateway: "stripe",
                paymentMethod: "card",
            },
            {
                skip: 8,
                limit: 4,
            }
        );

        expect(
            mockPaymentHistoryHelper.countPaymentHistoryByUserId
        ).toHaveBeenCalledWith({
            userId: "68761a10a123456789900001",
            status: "success",
            paymentGateway: "stripe",
            paymentMethod: "card",
        });

        expect(result).toEqual({
            items: [],
            pagination: {
                page: 3,
                limit: 4,
                totalItems: 11,
                totalPages: 3,
            },
        });
    });

    test("falls back to default pagination values when page or limit is invalid", async () => {
        await paymentHistoryService.getMyPaymentHistory(
            "68761a10a123456789900001",
            {
                page: "0",
                limit: "NaN",
            }
        );

        expect(
            mockPaymentHistoryHelper.findPaymentHistoryByUserId
        ).toHaveBeenCalledWith(
            {
                userId: "68761a10a123456789900001",
            },
            {
                skip: 0,
                limit: 10,
            }
        );
    });

    test("caps the requested limit at the maximum value of 50", async () => {
        const result = await paymentHistoryService.getMyPaymentHistory(
            "68761a10a123456789900001",
            {
                page: "2",
                limit: "100",
            }
        );

        expect(
            mockPaymentHistoryHelper.findPaymentHistoryByUserId
        ).toHaveBeenCalledWith(
            {
                userId: "68761a10a123456789900001",
            },
            {
                skip: 50,
                limit: 50,
            }
        );

        expect(result.pagination).toEqual({
            page: 2,
            limit: 50,
            totalItems: 0,
            totalPages: 0,
        });
    });

    test("throws AppError 400 when status is not a string", async () => {
        const promise = paymentHistoryService.getMyPaymentHistory(
            "68761a10a123456789900001",
            {
                status: 123,
            }
        );

        await expect(promise).rejects.toBeInstanceOf(AppError);
        await expect(promise).rejects.toMatchObject({
            message: "Invalid status.",
            statusCode: 400,
            details: {
                field: "status",
            },
        });

        expect(
            mockPaymentHistoryHelper.findPaymentHistoryByUserId
        ).not.toHaveBeenCalled();
    });

    test("throws AppError 400 when payment gateway is invalid", async () => {
        const promise = paymentHistoryService.getMyPaymentHistory(
            "68761a10a123456789900001",
            {
                paymentGateway: "paypal",
            }
        );

        await expect(promise).rejects.toBeInstanceOf(AppError);
        await expect(promise).rejects.toMatchObject({
            message: "Invalid paymentGateway.",
            statusCode: 400,
            details: {
                field: "paymentGateway",
                allowedValues: ["momo", "vnpay", "stripe"],
            },
        });
    });

    test("throws AppError 400 when payment method is invalid", async () => {
        const promise = paymentHistoryService.getMyPaymentHistory(
            "68761a10a123456789900001",
            {
                paymentMethod: "cash",
            }
        );

        await expect(promise).rejects.toBeInstanceOf(AppError);
        await expect(promise).rejects.toMatchObject({
            message: "Invalid paymentMethod.",
            statusCode: 400,
            details: {
                field: "paymentMethod",
                allowedValues: ["momo", "vnpay", "stripe", "card"],
            },
        });
    });

    test("throws AppError 401 when user is unauthorized", async () => {
        const promise = paymentHistoryService.getMyPaymentHistory("");

        await expect(promise).rejects.toBeInstanceOf(AppError);
        await expect(promise).rejects.toMatchObject({
            message: "Unauthorized.",
            statusCode: 401,
        });

        expect(
            mockPaymentHistoryHelper.findPaymentHistoryByUserId
        ).not.toHaveBeenCalled();
    });

    test("propagates helper failure when reading payment history fails", async () => {
        const error = new Error("Read payment history failed.");

        mockPaymentHistoryHelper.findPaymentHistoryByUserId.mockRejectedValue(
            error
        );

        await expect(
            paymentHistoryService.getMyPaymentHistory(
                "68761a10a123456789900001"
            )
        ).rejects.toBe(error);
    });

    test("propagates helper failure when counting payment history fails", async () => {
        const error = new Error("Count payment history failed.");

        mockPaymentHistoryHelper.countPaymentHistoryByUserId.mockRejectedValue(
            error
        );

        await expect(
            paymentHistoryService.getMyPaymentHistory(
                "68761a10a123456789900001"
            )
        ).rejects.toBe(error);
    });
});

describe("paymentHistoryService.getPaymentDetail", () => {
    let paymentHistoryService;
    let AppError;

    beforeEach(async () => {
        jest.clearAllMocks();
        setupMocks();

        ({ paymentHistoryService, AppError } =
            await loadPaymentHistoryService());
    });

    test("returns payment detail successfully for the requesting user", async () => {
        const payment = createPayment();

        mockPaymentHistoryHelper.findPaymentDetailByUserId.mockResolvedValue(
            payment
        );

        const result = await paymentHistoryService.getPaymentDetail(
            "68761a10a123456789900001",
            "68761a10a123456789400001"
        );

        expect(mockMongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(
            "68761a10a123456789400001"
        );

        expect(
            mockPaymentHistoryHelper.findPaymentDetailByUserId
        ).toHaveBeenCalledWith(
            "68761a10a123456789900001",
            "68761a10a123456789400001"
        );

        expect(result).toEqual({
            id: "68761a10a123456789400001",
            invoiceNumber: "INV-DETAIL-001",
            gatewayTransactionId: "gateway-detail-001",
            planName: "Premium Annual",
            amount: 149000,
            tax: 10000,
            totalAmount: 159000,
            currency: "VND",
            paymentMethod: "card",
            paymentGateway: "stripe",
            status: "success",
            failureReason: "",
            paidAt: payment.paidAt,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
            plan: {
                id: "68761a10a123456789500001",
                name: "Premium Annual",
                price: 149000,
            },
            subscription: {
                id: "68761a10a123456789600001",
                status: "active",
                startDate: payment.subscriptionId.startDate,
                endDate: payment.subscriptionId.endDate,
                autoRenew: true,
            },
        });
    });

    test("throws AppError 401 when user is unauthorized", async () => {
        const promise = paymentHistoryService.getPaymentDetail(
            null,
            "68761a10a123456789400001"
        );

        await expect(promise).rejects.toBeInstanceOf(AppError);
        await expect(promise).rejects.toMatchObject({
            message: "Unauthorized.",
            statusCode: 401,
        });

        expect(mockMongoose.Types.ObjectId.isValid).not.toHaveBeenCalled();
    });

    test("throws AppError 400 when payment id is invalid", async () => {
        mockMongoose.Types.ObjectId.isValid.mockReturnValue(false);

        const promise = paymentHistoryService.getPaymentDetail(
            "68761a10a123456789900001",
            "invalid-payment-id"
        );

        await expect(promise).rejects.toBeInstanceOf(AppError);
        await expect(promise).rejects.toMatchObject({
            message: "Payment id is invalid.",
            statusCode: 400,
        });

        expect(
            mockPaymentHistoryHelper.findPaymentDetailByUserId
        ).not.toHaveBeenCalled();
    });

    test("throws AppError 404 when payment is not found", async () => {
        const promise = paymentHistoryService.getPaymentDetail(
            "68761a10a123456789900001",
            "68761a10a123456789400001"
        );

        await expect(promise).rejects.toBeInstanceOf(AppError);
        await expect(promise).rejects.toMatchObject({
            message: "Payment not found.",
            statusCode: 404,
        });
    });

    test("propagates helper failure when reading payment detail fails", async () => {
        const error = new Error("Read payment detail failed.");

        mockPaymentHistoryHelper.findPaymentDetailByUserId.mockRejectedValue(
            error
        );

        await expect(
            paymentHistoryService.getPaymentDetail(
                "68761a10a123456789900001",
                "68761a10a123456789400001"
            )
        ).rejects.toBe(error);
    });
});

describe("paymentHistoryService.getPaymentReceiptPdf", () => {
    let paymentHistoryService;
    let AppError;

    beforeEach(async () => {
        jest.clearAllMocks();
        setupMocks();

        ({ paymentHistoryService, AppError } =
            await loadPaymentHistoryService());
    });

    test("returns a receipt pdf buffer for the requesting user's payment", async () => {
        const payment = createPayment({
            planName: "",
            planId: {
                _id: {
                    toString: () => "68761a10a123456789500002",
                },
                title: "Premium Plus",
                amount: 149000,
            },
        });

        mockPaymentHistoryHelper.findPaymentDetailByUserId.mockResolvedValue(
            payment
        );

        const result = await paymentHistoryService.getPaymentReceiptPdf(
            "68761a10a123456789900001",
            "68761a10a123456789400001"
        );

        const drawnTexts = getDrawnTexts();
        const expectedDate = new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(new Date(payment.paidAt));

        expect(mockMongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(
            "68761a10a123456789400001"
        );

        expect(
            mockPaymentHistoryHelper.findPaymentDetailByUserId
        ).toHaveBeenCalledWith(
            "68761a10a123456789900001",
            "68761a10a123456789400001"
        );

        expect(mockPdfLib.PDFDocument.create).toHaveBeenCalledTimes(1);
        expect(mockPdfDoc.addPage).toHaveBeenCalledWith([595.28, 841.89]);
        expect(mockPdfDoc.embedFont).toHaveBeenNthCalledWith(
            1,
            mockPdfLib.StandardFonts.Helvetica
        );
        expect(mockPdfDoc.embedFont).toHaveBeenNthCalledWith(
            2,
            mockPdfLib.StandardFonts.HelveticaBold
        );
        expect(mockPage.drawRectangle).toHaveBeenCalledTimes(2);
        expect(mockPdfDoc.save).toHaveBeenCalledTimes(1);
        expect(drawnTexts).toContain("Reso");
        expect(drawnTexts).toContain("Payment Receipt");
        expect(drawnTexts).toContain("INV-DETAIL-001");
        expect(drawnTexts).toContain(expectedDate);
        expect(drawnTexts).toContain("Premium Plus");
        expect(drawnTexts).toContain(
            `${new Intl.NumberFormat("vi-VN").format(149000)} VND`
        );
        expect(drawnTexts).toContain(
            `${new Intl.NumberFormat("vi-VN").format(159000)} VND`
        );
        expect(drawnTexts).toContain("card");
        expect(result).toEqual(Buffer.from([1, 2, 3]));
    });

    test("uses fallback receipt values when optional payment fields are missing", async () => {
        const payment = createPayment({
            invoiceNumber: "",
            planName: "",
            amount: 50000,
            tax: 0,
            totalAmount: 0,
            paymentMethod: "",
            paymentGateway: "stripe",
            paidAt: null,
            createdAt: null,
            planId: {
                _id: {
                    toString: () => "68761a10a123456789500003",
                },
                name: "",
                title: "",
                price: undefined,
                amount: undefined,
            },
        });

        mockPaymentHistoryHelper.findPaymentDetailByUserId.mockResolvedValue(
            payment
        );

        await paymentHistoryService.getPaymentReceiptPdf(
            "68761a10a123456789900001",
            "68761a10a123456789400001"
        );

        const drawnTexts = getDrawnTexts();

        expect(drawnTexts).toContain("--");
        expect(drawnTexts).toContain("Premium");
        expect(drawnTexts).toContain(
            `${new Intl.NumberFormat("vi-VN").format(50000)} VND`
        );
        expect(drawnTexts).toContain(
            `${new Intl.NumberFormat("vi-VN").format(0)} VND`
        );
        expect(drawnTexts).toContain("stripe");
    });

    test("throws AppError 401 when user is unauthorized", async () => {
        const promise = paymentHistoryService.getPaymentReceiptPdf(
            undefined,
            "68761a10a123456789400001"
        );

        await expect(promise).rejects.toBeInstanceOf(AppError);
        await expect(promise).rejects.toMatchObject({
            message: "Unauthorized.",
            statusCode: 401,
        });

        expect(mockMongoose.Types.ObjectId.isValid).not.toHaveBeenCalled();
    });

    test("throws AppError 400 when payment id is invalid", async () => {
        mockMongoose.Types.ObjectId.isValid.mockReturnValue(false);

        const promise = paymentHistoryService.getPaymentReceiptPdf(
            "68761a10a123456789900001",
            "invalid-payment-id"
        );

        await expect(promise).rejects.toBeInstanceOf(AppError);
        await expect(promise).rejects.toMatchObject({
            message: "Payment id is invalid.",
            statusCode: 400,
        });

        expect(
            mockPaymentHistoryHelper.findPaymentDetailByUserId
        ).not.toHaveBeenCalled();
    });

    test("throws AppError 404 when payment is not found", async () => {
        const promise = paymentHistoryService.getPaymentReceiptPdf(
            "68761a10a123456789900001",
            "68761a10a123456789400001"
        );

        await expect(promise).rejects.toBeInstanceOf(AppError);
        await expect(promise).rejects.toMatchObject({
            message: "Payment not found.",
            statusCode: 404,
        });
    });

    test("propagates helper failure when retrieving payment for receipt fails", async () => {
        const error = new Error("Receipt payment lookup failed.");

        mockPaymentHistoryHelper.findPaymentDetailByUserId.mockRejectedValue(
            error
        );

        await expect(
            paymentHistoryService.getPaymentReceiptPdf(
                "68761a10a123456789900001",
                "68761a10a123456789400001"
            )
        ).rejects.toBe(error);
    });

    test("propagates pdf generation failure", async () => {
        const error = new Error("PDF save failed.");

        mockPaymentHistoryHelper.findPaymentDetailByUserId.mockResolvedValue(
            createPayment()
        );
        mockPdfDoc.save.mockRejectedValue(error);

        await expect(
            paymentHistoryService.getPaymentReceiptPdf(
                "68761a10a123456789900001",
                "68761a10a123456789400001"
            )
        ).rejects.toBe(error);
    });
});
