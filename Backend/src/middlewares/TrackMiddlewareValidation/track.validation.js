import Joi from "joi";

const createTrackSchema = Joi.object({
    title: Joi.string()
        .trim()
        .required()
        .min(1)
        .max(255)
        .messages({
            "string.empty": "Title is required",
            "any.required": "Title is required",
            "string.min": "Title must be at least 1 character",
            "string.max": "Title cannot exceed 255 characters",
        }),

    duration: Joi.number()
        .required()
        .positive()
        .messages({
            "number.base": "Duration must be a number",
            "any.required": "Duration is required",
            "number.positive": "Duration must be a positive number",
        }),

    album_albumId: Joi.string()
        .optional()
        .allow("")
        .messages({
            "string.base": "Album ID must be a string",
        }),

    genreIds: Joi.array()
        .items(Joi.string())
        .optional()
        .messages({
            "array.base": "Genre IDs must be an array",
        }),

    audioFiles: Joi.array()
        .items(
            Joi.object().keys({
                url: Joi.string().required(),
                format: Joi.string().required(),
                bitrate: Joi.number().required(),
                label: Joi.string()
                    .optional()
                    .valid("original", "high", "medium", "low", "lowest")
                    .default("original"),
                priority: Joi.number()
                    .optional()
                    .default(0),
            })
        )
        .optional()
        .messages({
            "array.base": "Audio files must be an array",
        }),

    avatar: Joi.string()
        .optional()
        .allow("")
        .messages({
            "string.base": "Avatar must be a string",
        }),

    coverImage: Joi.array()
        .items(Joi.string())
        .optional()
        .messages({
            "array.base": "Cover image must be an array",
        }),

    lyricsStatic: Joi.string()
        .optional()
        .allow("")
        .messages({
            "string.base": "Static lyrics must be a string",
        }),

    lyricsSyncUrl: Joi.string()
        .optional()
        .allow("")
        .messages({
            "string.base": "Sync lyrics URL must be a string",
        }),

    releaseDate: Joi.date()
        .optional()
        .allow(null)
        .messages({
            "date.base": "Release date must be a valid date",
        }),

    activeStatus: Joi.string()
        .optional()
        .valid("draft", "active", "hidden", "blocked")
        .default("draft")
        .messages({
            "any.only": "Active status must be one of: draft, active, hidden, blocked",
        }),
});

export default createTrackSchema;
