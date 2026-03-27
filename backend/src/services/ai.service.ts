import { GoogleGenerativeAI } from "@google/generative-ai";

export const generativeAIResponse = async (prompt: string): Promise<string> => {

    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY");
    }

    const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    //console.log("KEY:", process.env.GEMINI_API_KEY);

    const model = genAi.getGenerativeModel({
        model: "gemini-2.5-flash"
    });

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return text;
    } catch (err) {
        console.error("AI service Error: ", err);
        throw new Error("AI Generation failed");
    }
};