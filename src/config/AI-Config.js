import { ENV } from "./env.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// this is the user prompt
const userPrompt = `
You are an AI Instructional Designer and Subject Matter Expert. Your task is to generate a complete, in-depth, and practical course for the topic "[userInput]" in a specific JSON format.

The content must be precise, comprehensive, and pedagogically sound, tailored for a learner with a foundational understanding (like a B.Tech student). Avoid generic or superficial explanations; prioritize clarity and depth.

The final output MUST be a single, minified JSON object wrapped exactly like \`{"courses": [ { ... course object ... } ]}\`, adhering strictly to the following structure and constraints:

1.  **Top Level:** The JSON must start with \`{"courses": [\` and end with \`]}\`. Inside the array, there must be only ONE course object.
2.  **Course Metadata:** The course object MUST include the keys: \`"courseTitle"\` (reflecting the topic), \`"description"\` (a concise, compelling summary of what the learner will achieve), \`"category"\` (choose one from: ["Tech & Coding", "Business & Finance", "Health & Fitness", "Science & Engineering", "Arts & Creativity", "History and Mythology", "Mathematics", "Physics, Chemistry and Biology"]), and \`"difficulty"\` (choose one: "Easy", "Intermediate", "Advanced").
3.  **Chapters:** The course must contain **EXACTLY 5 chapters**, logically sequenced to build knowledge.
4.  **Content Per Chapter:** Each chapter must contain a chapter name as **chapterName** key value and **exactly 4 content objects** within its \`"content"\` array.
5.  **Content Structure:** Each content object MUST have exactly four keys:
    * \`"topic"\`: A specific, focused sub-topic (3-5 words).
    * \`"explain"\`: A **comprehensive and clear explanation**. This is the most critical part. It must be **pedagogical** (teach the concept clearly) and **substantive**. Aim for **100-150 words** to ensure sufficient detail. It must break down the "why" and "how," not just the "what."
    * \`"code"\`: A **concise, correct, and well-commented** code example if the topic is technical (e.g., programming, data science). Use \`null\` if the topic is non-technical (e.g., history, arts).
    * \`"example"\`: A **concrete, real-world example or case study** that illustrates the topic in practice. This must be distinct from the \`"explain"\` content. Use \`null\` if a practical example is not applicable.
6.  **Quizzes:** Generate **exactly 12 quiz objects** as **quiz** as key value. Ensure questions are **thought-provoking** and test the *understanding* of the core concepts from the content, not just simple recall. Each object must have \`"question"\`, \`"options"\` (an array of 4 strings), and \`"correctAns"\`.
7.  **Flashcards:** Generate **exactly 12 flashcard objects** as **flashcards** as key value. The \`"front"\` should be a key term or concept, and the \`"back"\` should be a clear, concise definition or explanation.
8.  **Q&A:** Generate **exactly 12 question-answer objects** as **qa** as key value. These should reflect common questions a student might have about the material, with **clear, direct, and helpful answers**.
9.  **CRITICAL RULE FOR VALID JSON:** Ensure that all double quotes (\`"\`) that appear *inside* any JSON string value (like within the \`explain\`, \`code\`, \`example\`, \`question\`, \`answer\`, \`options\`, \`front\`, or \`back\` fields) are properly escaped with a backslash (\`\\\`). For example: \`"print(\\"Hi\\")"\`. This is essential for the JSON to be valid.
`;

export const chatWithGemini = async (userInput) => {
    const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    });
    try {
        // generate the result
        const result = await model.generateContent(userPrompt.replace("[userInput]", userInput));
        const response = await result.response;
        let jsonText = response.text();

        // 6. =========== UPDATED CLEANUP LOGIC ===========
        // This is a more robust way to clean the response.
        // It finds the first '{' and the last '}' and extracts everything between them.
        // This handles "json {...", "```json\n{...", and any other text.

        const startIndex = jsonText.indexOf('{');
        const endIndex = jsonText.lastIndexOf('}');

        if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
            // If we can't find a valid JSON object
            console.error('❌ Error: Could not find a valid JSON object in the model\'s response.');
            console.error('Raw output from model:', jsonText);
            return; // Stop execution
        }

        // Extract the JSON string
        jsonText = jsonText.substring(startIndex, endIndex + 1);
        // =================================================

        //(Optional) Validate that the output is valid JSON
        try {
            JSON.parse(jsonText);
            console.log('\n✅ JSON is valid!');
        } catch (e) {
            console.error('\n❌ Error parsing JSON:', e.message);
            console.error('Raw output from model:', response.text());
        }
        return jsonText;
    } catch (error) {
        console.log("Error: " + error.message)
    }
}