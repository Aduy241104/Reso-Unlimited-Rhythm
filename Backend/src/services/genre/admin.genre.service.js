import Genre from "../../models/Genre.js";
import { uploadImageBuffer } from "../cloudinaryService.js";

const getGenres = async (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 20);
    const q = (query.q || "").trim();

    const filter = {};

    if (q) {
        const regex = new RegExp(q, "i");
        filter.$or = [{ name: regex }, { description: regex }];
    }

    if (typeof query.isActive !== "undefined") {
        if (query.isActive === "true" || query.isActive === true) {
            filter.isActive = true;
        } else if (query.isActive === "false" || query.isActive === false) {
            filter.isActive = false;
        }
    }

    const total = await Genre.countDocuments(filter);

    const genres = await Genre.find(filter)
        .select("_id name description image isActive createdAt")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

    const meta = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };

    return { genres, meta };
};

const createGenre = async (genreData) => {
    const genre = new Genre({
        name: genreData.name?.trim(),
        description: genreData.description?.trim() || "",
        image: genreData.image?.trim() || "",
        isActive: typeof genreData.isActive !== "undefined" ? genreData.isActive : true,
    });

    return genre.save();
};

const getGenreById = async (id) =>
    Genre.findById(id)
        .select("_id name description image isActive createdAt")
        .lean();

const updateGenre = async (id, genreData) => {
    const updates = {};

    if (typeof genreData.name !== "undefined") {
        updates.name = genreData.name?.trim();
    }

    if (typeof genreData.description !== "undefined") {
        updates.description = genreData.description?.trim() || "";
    }

    if (typeof genreData.image !== "undefined") {
        updates.image = genreData.image?.trim() || "";
    }

    if (typeof genreData.isActive !== "undefined") {
        updates.isActive = genreData.isActive;
    }

    const genre = await Genre.findByIdAndUpdate(id, updates, {
        new: true,
    }).select("_id name description image isActive createdAt");

    return genre;
};

const uploadGenreImage = async (fileBuffer) => {
    const uploadResult = await uploadImageBuffer({
        buffer: fileBuffer,
        folder: "reso/genres",
    });

    return uploadResult.secure_url;
};

export default {
    getGenres,
    createGenre,
    getGenreById,
    updateGenre,
    uploadGenreImage,
};
