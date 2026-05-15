import Genre from "../../models/Genre.js";

const listActiveGenres = async () =>
    Genre.find({ isActive: true })
        .sort({ name: 1 })
        .select("_id name")
        .lean();

export default {
    listActiveGenres,
};
