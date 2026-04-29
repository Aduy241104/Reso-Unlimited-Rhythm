import mongoose from "mongoose";

const { Schema, model } = mongoose;

const GenreSchema = new Schema(
    {
        name: { type: String, required: true, trim: true, unique: true, index: true },
        description: { type: String, default: "" },
        image: { type: String, default: "" },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

const Genre = model("Genre", GenreSchema);
export default Genre;