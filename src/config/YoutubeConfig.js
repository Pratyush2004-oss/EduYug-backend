/**
 * Fetches video data from YouTube based on a topic.
 * This is the core function you asked for.
 * * @param {string} topic - The user's search input (e.g., "React Native").
 * @returns {Promise<Array>} - A promise that resolves to an array of video objects.
 */
import axios from "axios";
import { ENV } from "./env.js";

async function fetchYoutubeData(topic) {
    try {
        // get the api key
        const apikey = ENV.YOUTUBE_API_KEY;
        if (!apikey) {
            throw new Error("API Key not found");
        }

        const searchUrl = "https://www.googleapis.com/youtube/v3/search";
        // set up the API request parameters
        const params = {
            key: apikey,
            part: "snippet",
            maxResults: 5,
            q: topic,
            type: "video",
            videoDuration: "long",
        };

        const response = await axios.get(searchUrl, { params });
        const items = response.data.items;

        const videoData = items.map((item) => {
            const videoId = item.id.videoId;
            return {
                url: videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.high.url,
            }
        });
        return videoData;
    } catch (error) {
        console.error("Error fetching video data:", error);
        return [];
    }
}

export default fetchYoutubeData;