const normalizeSearchKeyword = (q) => {
    if (typeof q !== "string") {
        return "";
    }

    return q.trim();
};

const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildRegexKeyword = (keyword) => {
    return new RegExp(escapeRegex(keyword), "i");
};

const removeVietnameseTones = (text) => {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ð/g, "d")
        .replace(/Ð/g, "D");
};

const normalizeSearchText = (text) => {
    if (typeof text !== "string") {
        return "";
    }

    return removeVietnameseTones(text).toLowerCase().trim();
};

const isSearchTextMatched = (source, keyword) => {
    const normalizedKeyword = normalizeSearchText(keyword);

    if (!normalizedKeyword) {
        return false;
    }

    const normalizedSource = normalizeSearchText(source);

    return normalizedSource.includes(normalizedKeyword);
};

const normalizePagination = (query = {}, defaultLimit = 10, maxLimit = 20) => {
    const rawPage = Number(query.page);
    const rawLimit = Number(query.limit);

    const page = Math.max(1, rawPage || 1);
    const limit = Math.min(Math.max(1, rawLimit || defaultLimit), maxLimit);
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

const buildSongsSearchFilter = (keyword) => {
    if (!keyword) {
        return null;
    }

    return {
        activeStatus: "active",
        approvalStatus: "approved",
    };
};

const buildArtistsSearchFilter = (keyword) => {
    if (!keyword) {
        return null;
    }

    return {
        activeStatus: "active",
        verificationStatus: "verified",
    };
};

const buildAlbumsSearchFilter = (keyword) => {
    if (!keyword) {
        return null;
    }

    return {
        status: "active",
    };
};

const buildPaginationMeta = (page, limit, totalItems) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage,
        hasPrevPage,
    };
};

export {
    normalizeSearchKeyword,
    escapeRegex,
    buildRegexKeyword,
    removeVietnameseTones,
    normalizeSearchText,
    isSearchTextMatched,
    normalizePagination,
    buildSongsSearchFilter,
    buildArtistsSearchFilter,
    buildAlbumsSearchFilter,
    buildPaginationMeta,
};
