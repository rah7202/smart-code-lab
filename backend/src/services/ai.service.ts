import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../utils/logger";

//----------------SINGLETON--------------------------
const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAi.getGenerativeModel({ model: "gemini-2.5-flash" });

// ----------------GENERATIVE AI RESPONSE--------------------------
export const generativeAIResponse = async (prompt: string): Promise<string> => {
    if (!prompt?.trim()) throw new Error("Prompt cannot be empty");

    logger.info(`Generating response (prompt length: ${prompt.length})`);

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    logger.info(`[AI] Response generated (response length: ${text.length})`);
    return text;
};