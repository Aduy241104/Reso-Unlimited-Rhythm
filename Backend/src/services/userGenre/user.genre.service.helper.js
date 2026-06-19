const buildGenreListFilter = () => ({
    isActive: true,
});

const buildGenreDetailFilter = (genreId) => ({
    _id: genreId,
    isActive: true,
});

const buildGenreTracksFilter = (genreId) => ({
    genreIds: genreId,
    activeStatus: "active",
    approvalStatus: "approved",
});

const normalizePagination = (query = {}) => {
    const rawPage = Number.parseInt(query.page, 10);
    const rawLimit = Number.parseInt(query.limit, 10);

    const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);
    const limit = Math.min(24, Math.max(1, Number.isNaN(rawLimit) ? 24 : rawLimit));
    const skip = (page - 1) * limit;

    return {
        page,
        limit,
        skip,
    };
};

export {
    buildGenreListFilter,
    buildGenreDetailFilter,
    buildGenreTracksFilter,
    normalizePagination,
};

export default {
    buildGenreListFilter,
    buildGenreDetailFilter,
    buildGenreTracksFilter,
    normalizePagination,
};
