export const AUTH_CLIENT_TYPES = Object.freeze({
    WEB: "web",
    MOBILE: "mobile",
});

export const AUTH_CLIENT_TYPE_VALUES = Object.values(AUTH_CLIENT_TYPES);
export const DEFAULT_AUTH_CLIENT_TYPE = AUTH_CLIENT_TYPES.WEB;

export const normalizeAuthClientType = (clientType) =>
    clientType === AUTH_CLIENT_TYPES.MOBILE
        ? AUTH_CLIENT_TYPES.MOBILE
        : DEFAULT_AUTH_CLIENT_TYPE;

export const isWebAuthClientType = (clientType) =>
    normalizeAuthClientType(clientType) === AUTH_CLIENT_TYPES.WEB;

export const buildRefreshTokenClientTypeQuery = (clientType) => {
    const normalizedClientType = normalizeAuthClientType(clientType);

    if (normalizedClientType === AUTH_CLIENT_TYPES.WEB) {
        return {
            $or: [
                { clientType: AUTH_CLIENT_TYPES.WEB },
                { clientType: { $exists: false } },
            ],
        };
    }

    return {
        clientType: normalizedClientType,
    };
};
