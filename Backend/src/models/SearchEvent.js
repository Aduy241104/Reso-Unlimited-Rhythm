import mongoose from "mongoose";

const { Schema, model } = mongoose;

const SearchEventSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        keyword: { type: String, required: true, trim: true, index: true },
        clickedTrackId: { type: Schema.Types.ObjectId, ref: "Track", index: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

const SearchEvent = model("SearchEvent", SearchEventSchema);

export default SearchEvent;
