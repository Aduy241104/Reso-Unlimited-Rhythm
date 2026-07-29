const normalizeIp = (value = "") => {
    if (!value) {
        return "";
    }

    return value.replace(/^::ffff:/, "").trim();
};

const getClientIp = (req) => {
    const forwardedFor = req.headers["x-forwarded-for"];

    if (typeof forwardedFor === "string" && forwardedFor.trim()) {
        return normalizeIp(forwardedFor.split(",")[0]);
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
        return normalizeIp(forwardedFor[0]);
    }

    return normalizeIp(
        req.ip ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        "127.0.0.1"
    );
};

export {
    getClientIp,
};

