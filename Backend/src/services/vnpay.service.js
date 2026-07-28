import crypto from "node:crypto";
import { AppError } from "../utils/AppError.js";

const VNPAY_REQUIRED_ENV_KEYS = [
    "VNPAY_TMN_CODE",
    "VNPAY_HASH_SECRET",
    "VNPAY_PAY_URL",
    "VNPAY_RETURN_URL",
];

const DEFAULT_VNPAY_CONFIG = {
    version: "2.1.0",
    command: "pay",
    currCode: "VND",
    locale: "vn",
    orderType: "other",
    expiryMinutes: 15,
};

const encodeVnpValue = (value) =>
    encodeURIComponent(String(value)).replace(/%20/g, "+");

const sortVnpParams = (params = {}) =>
    Object.keys(params)
        .filter((key) => typeof params[key] !== "undefined" && params[key] !== null && params[key] !== "")
        .sort()
        .reduce((result, key) => {
            result[key] = params[key];
            return result;
        }, {});

const buildVnpQueryString = (params = {}) =>
    Object.entries(sortVnpParams(params))
        .map(([key, value]) => `${encodeVnpValue(key)}=${encodeVnpValue(value)}`)
        .join("&");

const createVnpSecureHash = (queryString, secret) =>
    crypto.createHmac("sha512", secret).update(Buffer.from(queryString, "utf-8")).digest("hex");

const getVnpayConfig = () => {
    const missingKeys = VNPAY_REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);

    if (missingKeys.length > 0) {
        throw new AppError("Missing VNPAY configuration.", 500, {
            missingEnv: missingKeys,
        });
    }

    return {
        tmnCode: process.env.VNPAY_TMN_CODE,
        hashSecret: process.env.VNPAY_HASH_SECRET,
        payUrl: process.env.VNPAY_PAY_URL,
        returnUrl: process.env.VNPAY_RETURN_URL,
        version: process.env.VNPAY_VERSION || DEFAULT_VNPAY_CONFIG.version,
        command: process.env.VNPAY_COMMAND || DEFAULT_VNPAY_CONFIG.command,
        currCode: process.env.VNPAY_CURR_CODE || DEFAULT_VNPAY_CONFIG.currCode,
        locale: process.env.VNPAY_LOCALE || DEFAULT_VNPAY_CONFIG.locale,
        orderType: process.env.VNPAY_ORDER_TYPE || DEFAULT_VNPAY_CONFIG.orderType,
        expiryMinutes:
            Number(process.env.VNPAY_EXPIRE_MINUTES || DEFAULT_VNPAY_CONFIG.expiryMinutes) ||
            DEFAULT_VNPAY_CONFIG.expiryMinutes,
    };
};

const formatVnpDate = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const buildPaymentUrl = ({
    amount,
    invoiceNumber,
    orderInfo,
    ipAddr,
    createDate = new Date(),
    expireDate,
}) => {
    const config = getVnpayConfig();
    const params = {
        vnp_Version: config.version,
        vnp_Command: config.command,
        vnp_TmnCode: config.tmnCode,
        vnp_Amount: Math.round(Number(amount) * 100),
        vnp_CurrCode: config.currCode,
        vnp_TxnRef: invoiceNumber,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: config.orderType,
        vnp_Locale: config.locale,
        vnp_ReturnUrl: config.returnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: formatVnpDate(createDate),
        vnp_ExpireDate: formatVnpDate(expireDate),
    };
    const queryString = buildVnpQueryString(params);
    const secureHash = createVnpSecureHash(queryString, config.hashSecret);

    return `${config.payUrl}?${queryString}&vnp_SecureHash=${secureHash}`;
};

const verifyCallback = (query = {}) => {
    const config = getVnpayConfig();
    const normalizedQuery = { ...query };
    const providedHash = normalizedQuery.vnp_SecureHash || "";

    delete normalizedQuery.vnp_SecureHash;
    delete normalizedQuery.vnp_SecureHashType;

    const queryString = buildVnpQueryString(normalizedQuery);
    const expectedHash = createVnpSecureHash(queryString, config.hashSecret);

    return {
        isValid:
            Boolean(providedHash) &&
            expectedHash.toLowerCase() === String(providedHash).toLowerCase(),
        invoiceNumber: normalizedQuery.vnp_TxnRef || "",
        responseCode: normalizedQuery.vnp_ResponseCode || "",
        gatewayTransactionId: normalizedQuery.vnp_TransactionNo || "",
        amount: Number(normalizedQuery.vnp_Amount || 0) / 100,
    };
};

export default {
    getVnpayConfig,
    buildPaymentUrl,
    verifyCallback,
};
