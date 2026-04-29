export const normalizeId = (obj) => ({
    ...obj,
    id: obj._id.toString(),
    _id: undefined,
    __v: undefined
});
