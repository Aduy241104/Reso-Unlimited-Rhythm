import dotenv from "dotenv";
dotenv.config(); 
import { createClient } from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});

export const connectRedis = async () => {
    if (!process.env.REDIS_URL) {
        console.warn("Redis is disabled because REDIS_URL is not configured.");
        return false;
    }

    if (redisClient.isOpen) {
        return true;
    }

    try {
        await redisClient.connect();
        console.log("Redis connected successfully");
        return true;
    } catch (error) {
        console.error("Failed to connect Redis:", error);
        return false;
    }
};

export default redisClient;
