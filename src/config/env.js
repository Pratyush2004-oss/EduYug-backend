import dotenv from 'dotenv';
dotenv.config();
export const ENV = {
    PORT: process.env.PORT,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY
}