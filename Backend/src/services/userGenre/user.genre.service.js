import Genre from "../../models/Genre.js";
import { buildGenreListFilter } from "./user.genre.service.helper.js";

const getGenreList = async () => {
    const filter = buildGenreListFilter();

    return await Genre.find(filter)
        .sort({ name: 1 })
        .lean();
};

export { getGenreList };

export default {
    getGenreList,
};
