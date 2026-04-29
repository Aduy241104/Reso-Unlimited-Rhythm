import crypto from "crypto";
const OTP_LEN = 6;

export const generateOtp = () =>
    String(crypto.randomInt(0, 10 ** OTP_LEN)).padStart(OTP_LEN, "0");