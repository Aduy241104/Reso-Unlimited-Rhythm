import mongoose from "mongoose";

const connectMongoose = async () => {
    const dbURL = process.env.DATABASE;

    if (!dbURL) {
        throw new Error("DATABASE environment variable is not configured.");
    }

    try {
        await mongoose.connect(dbURL);
        console.log("🚀 MongoDB connected successfully");
        return mongoose.connection;
    } catch (err) {
        console.error("💥 MongoDB connection error:", err);
        throw err;
    }
};

export default connectMongoose;
