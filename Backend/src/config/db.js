import mongoose from "mongoose";

const connectMongoose = async () => {
    const dbURL = process.env.DATABASE;
    try {
        await mongoose.connect(dbURL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("🚀 MongoDB connected successfully");
    } catch (err) {
        console.error("💥 MongoDB connection error:", err);
    }
};

export default connectMongoose;
