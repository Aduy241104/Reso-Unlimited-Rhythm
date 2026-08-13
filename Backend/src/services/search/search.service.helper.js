import { buildReleasedTrackFilter } from "../../utils/trackRelease.js";

const VIETNAMESE_CHARACTERS = {
    a: "aàáạảãăằắặẳẵâầấậẩẫ",
    d: "dđ",
    e: "eèéẹẻẽêềếệểễ",
    i: "iìíịỉĩ",
    o: "oòóọỏõôồốộổỗơờớợởỡ",
    u: "uùúụủũưừứựửữ",
    y: "yỳýỵỷỹ",
};

const normalizeSearchKeyword = (value) => {
    if (typeof value !== "string") {
        return "";
    }

    return value.replace(/\s+/g, " ").trim();
};

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const removeVietnameseTones = (text) =>
    String(text || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");

const normalizeSearchText = (text) =>
    removeVietnameseTones(text)
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

const tokenizeSearchText = (text) =>
    normalizeSearchText(text).split(" ").filter(Boolean);

const buildAccentInsensitiveRegex = (text) => {
    const normalized = normalizeSearchText(text);
    const pattern = [...normalized]
        .map((character) => {
            const variants = VIETNAMESE_CHARACTERS[character];
            return variants ? `[${variants}]` : escapeRegex(character);
        })
        .join("");

    return new RegExp(pattern, "i");
};

const buildTextCandidateFilter = (fields, keyword) => {
    const tokens = tokenizeSearchText(keyword);

    if (!tokens.length) {
        return null;
    }

    return {
        $and: tokens.map((token) => ({
            $or: fields.map((field) => ({
                [field]: buildAccentInsensitiveRegex(token),
            })),
        })),
    };
};

const addReferenceCandidateFilter = (
    baseFilter,
    textFilter,
    referenceField,
    referenceIds = []
) => {
    const candidates = [];

    if (textFilter) {
        candidates.push(textFilter);
    }

    if (referenceIds.length > 0) {
        candidates.push({ [referenceField]: { $in: referenceIds } });
    }

    if (candidates.length === 0) {
        return baseFilter;
    }

    return {
        $and: [baseFilter, { $or: candidates }],
    };
};

const buildSongsSearchFilter = (keyword, artistIds = []) =>
    addReferenceCandidateFilter(
        {
            activeStatus: "active",
            isDeleted: { $ne: true },
            approvalStatus: "approved",
            ...buildReleasedTrackFilter(),
        },
        buildTextCandidateFilter(["title", "versionTitle"], keyword),
        "artist_artistId",
        artistIds
    );

const buildArtistsSearchFilter = (keyword) =>
    addReferenceCandidateFilter(
        {
            activeStatus: "active",
            isDeleted: { $ne: true },
        },
        buildTextCandidateFilter(["name"], keyword),
        "_id"
    );

const buildAlbumsSearchFilter = (keyword, artistIds = []) =>
    addReferenceCandidateFilter(
        {
            status: "active",
            isDeleted: { $ne: true },
        },
        buildTextCandidateFilter(["title"], keyword),
        "artistId",
        artistIds
    );

const buildPodcastsSearchFilter = (keyword, creatorIds = []) =>
    addReferenceCandidateFilter(
        {
            approvalStatus: "approved",
            visibility: "public",
            isBlocked: false,
            isDeleted: { $ne: true },
        },
        buildTextCandidateFilter(["title"], keyword),
        "creator",
        creatorIds
    );

const buildPlaylistsSearchFilter = (keyword) => ({
    $and: [
        {
            isHidden: false,
            $or: [{ type: "system" }, { isPublic: true }],
        },
        buildTextCandidateFilter(["title"], keyword),
    ],
});

const buildPaginationMeta = (page, limit, totalItems) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    };
};

const normalizePagination = (query = {}, defaultLimit = 10, maxLimit = 20) => {
    const rawPage = Number(query.page);
    const rawLimit = Number(query.limit);
    const page = Math.max(1, rawPage || 1);
    const limit = Math.min(Math.max(1, rawLimit || defaultLimit), maxLimit);

    return { page, limit, skip: (page - 1) * limit };
};

const getOrderedTokenMatch = (sourceTokens, queryTokens, allowPrefix) => {
    let sourceIndex = 0;
    let firstIndex = -1;
    let lastIndex = -1;

    for (const queryToken of queryTokens) {
        const matchedIndex = sourceTokens.findIndex((sourceToken, index) => {
            if (index < sourceIndex) {
                return false;
            }

            return allowPrefix
                ? sourceToken.startsWith(queryToken)
                : sourceToken === queryToken;
        });

        if (matchedIndex < 0) {
            return null;
        }

        if (firstIndex < 0) {
            firstIndex = matchedIndex;
        }

        lastIndex = matchedIndex;
        sourceIndex = matchedIndex + 1;
    }

    return { firstIndex, lastIndex };
};

const levenshteinDistance = (left, right) => {
    if (left === right) {
        return 0;
    }

    if (!left.length || !right.length) {
        return Math.max(left.length, right.length);
    }

    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

    for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
        const current = [leftIndex + 1];

        for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
            current.push(
                Math.min(
                    current[rightIndex] + 1,
                    previous[rightIndex + 1] + 1,
                    previous[rightIndex] + (left[leftIndex] === right[rightIndex] ? 0 : 1)
                )
            );
        }

        previous.splice(0, previous.length, ...current);
    }

    return previous[right.length];
};

const scoreSearchMatch = (source, keyword) => {
    const normalizedSource = normalizeSearchText(source);
    const normalizedKeyword = normalizeSearchText(keyword);
    const queryTokens = tokenizeSearchText(keyword);
    const sourceTokens = tokenizeSearchText(source);

    if (!normalizedSource || !normalizedKeyword || !queryTokens.length) {
        return -1;
    }

    if (normalizedSource === normalizedKeyword) {
        return 100;
    }

    if (normalizedSource.startsWith(normalizedKeyword)) {
        return 90;
    }

    const prefixMatch = getOrderedTokenMatch(sourceTokens, queryTokens, true);

    if (prefixMatch) {
        const gap = prefixMatch.lastIndex - prefixMatch.firstIndex + 1 - queryTokens.length;
        return Math.max(60, 80 - gap * 4);
    }

    const exactTokenMatch = getOrderedTokenMatch(sourceTokens, queryTokens, false);

    if (exactTokenMatch) {
        const gap = exactTokenMatch.lastIndex - exactTokenMatch.firstIndex + 1 - queryTokens.length;
        return Math.max(50, 70 - gap * 4);
    }

    const hasAllExactTokens = queryTokens.every((queryToken) =>
        sourceTokens.some((sourceToken) => sourceToken === queryToken)
    );

    if (hasAllExactTokens) {
        return -1;
    }

    if (queryTokens.every((queryToken) => {
        if (queryToken.length < 4) {
            return false;
        }

        return sourceTokens.some(
            (sourceToken) => levenshteinDistance(sourceToken, queryToken) <= 1
        );
    })) {
        return 30;
    }

    return -1;
};

const scoreSearchStartsWith = (source, keyword) => {
    const normalizedSource = normalizeSearchText(source);
    const normalizedKeyword = normalizeSearchText(keyword);

    if (!normalizedSource || !normalizedKeyword) {
        return -1;
    }

    if (normalizedSource === normalizedKeyword) {
        return 100;
    }

    return normalizedSource.startsWith(normalizedKeyword) ? 90 : -1;
};

const scoreSearchFields = (fields, keyword) =>
    fields.reduce((bestScore, field) => Math.max(bestScore, scoreSearchMatch(field, keyword)), -1);

const isSearchTextMatched = (source, keyword) => scoreSearchMatch(source, keyword) >= 0;

export {
    addReferenceCandidateFilter,
    buildAccentInsensitiveRegex,
    buildAlbumsSearchFilter,
    buildArtistsSearchFilter,
    buildPaginationMeta,
    buildPodcastsSearchFilter,
    buildPlaylistsSearchFilter,
    buildSongsSearchFilter,
    buildTextCandidateFilter,
    escapeRegex,
    isSearchTextMatched,
    normalizePagination,
    normalizeSearchKeyword,
    normalizeSearchText,
    removeVietnameseTones,
    scoreSearchFields,
    scoreSearchMatch,
    scoreSearchStartsWith,
    tokenizeSearchText,
};
