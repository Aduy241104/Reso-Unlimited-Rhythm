import mongoose from "mongoose";

const { Schema, model } = mongoose;

const InteractionSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

        targetType: {
            type: String,
            enum: ["Track", "Artist", "Album", "Episode", "Podcast", "Post"],
            required: true,
            index: true,
        },

        targetId: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: "targetType",
            index: true,
        },

        action: {
            type: String,
            enum: ["like", "follow"],
            required: true,
            index: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

InteractionSchema.index(
    { userId: 1, targetType: 1, targetId: 1, action: 1 },
    { unique: true }
);

const Interaction = model("Interaction", InteractionSchema);
export default Interaction;