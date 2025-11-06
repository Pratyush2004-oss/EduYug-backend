import { ENV } from "./env.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// this is the user prompt
const userPrompt = `
You are an expert AI Instructional Designer and University-Level Educator. Your goal is to generate a complete, in-depth, and practical course for the topic [userInput].

Your target audience is an intelligent learner with foundational knowledge (like a 4th-year B.Tech student), so you must go beyond simple definitions. Every explanation must be pedagogically sound, clear, and comprehensive, building a deep and intuitive understanding.

The final output MUST be a single, minified JSON object wrapped exactly like {"courses": [ { ... course object ... } ]}\.

Strict JSON Structure and Content Rules:
Top Level: Must be {"courses": [ ... ]} containing a single course object.

Course Metadata: The course object MUST include:

"courseTitle": An accurate and compelling title.

"description": A 3-4 sentence summary of what the learner will be able to do after completing the course.

"category": Choose one: ["Tech & Coding", "Business & Finance", "Health & Fitness", "Science & Engineering", "Arts & Creativity", "History and Mythology", "Mathematics", "Physics, Chemistry and Biology"].

"difficulty": Choose one: "Easy", "Intermediate", "Advanced".

Chapters: Exactly 5 chapters, logically sequenced from fundamentals to advanced applications.

Content Per Chapter: Each chapter must have a "chapterName" key and exactly 4 content objects in its "content" array.

Content Object Structure: This is the most critical section. Each object MUST have these four keys with these specific instructions:

"topic": A specific, focused sub-topic (3-5 words).

"explain": This is the core teaching component. It must be a mini-lesson of 120-170 words. Do not just define the topic; you must teach it. To ensure true understanding, every "explain" string MUST follow this internal 4-part structure:

Definition: Start with a clear, concise definition ("What is it?").

Elaboration & Mechanism: Immediately follow with the "how" and "why." How does it work? What are its core components or principles? Why is it structured this way?

Analogy/Simple Context: Provide a simple analogy, metaphor, or a familiar concept to connect the new, abstract idea to something the learner already understands.

Significance & Role: Conclude with why this topic matters. What problem does it solve? What is its specific role in the bigger picture of the course?

"code": If technical, provide a practical, well-commented, and runnable code snippet that directly demonstrates the concept from the "explain" field. It must be more than "Hello World"; it must show the concept in action. Use null if non-technical.

"example": A vivid, real-world case study or application. Go beyond a simple mention. Briefly describe the scenario (e.g., "Imagine a streaming service like Netflix using this algorithm to... because..."). Use null if not applicable.

Quizzes: Generate exactly 12 quiz objects in an array named "quiz". Questions must test application and analysis of the concepts, not just rote memorization. Distractors ("options") should be plausible and based on common misconceptions.

Flashcards: Generate exactly 12 flashcard objects in an array named "flashcards". The "front" should be a key term, and the "back" should be a clear, concise, but complete definition.

Q&A: Generate exactly 12 question-answer objects in an array named "qa". These should address the most common and insightful questions a curious B.Tech student would ask about the material.

CRITICAL JSON RULE: All double quotes (") inside any JSON string value (e.g., in "explain", "code", "options", "answer", etc.) MUST be properly escaped with a backslash (\\). (e.g., "print(\\"Hello\\")").
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