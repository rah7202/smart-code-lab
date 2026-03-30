// backend/src/__tests__/services/ai.service.test.ts

jest.mock("@google/generative-ai", () => {
    const mockGenerateContent = jest.fn();
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue({
                generateContent: mockGenerateContent,
            }),
        })),
        // ✅ export the mock fn directly so tests can access it
        __mockGenerateContent: mockGenerateContent,
    };
});

import { generativeAIResponse } from "../../services/ai.service";
// @ts-ignore
import { __mockGenerateContent as mockGenerateContent } from "@google/generative-ai";

describe("ai.service — generativeAIResponse", () => {

    beforeEach(() => jest.clearAllMocks());

    it("returns text from Gemini response", async () => {
        mockGenerateContent.mockResolvedValueOnce({
            response: { text: () => "Here is the explanation." },
        });

        const result = await generativeAIResponse("Explain recursion");
        expect(result).toBe("Here is the explanation.");
        expect(mockGenerateContent).toHaveBeenCalledWith("Explain recursion");
    });

    it("throws when prompt is empty string", async () => {
        await expect(generativeAIResponse("")).rejects.toThrow("Prompt cannot be empty");
    });

    it("throws when prompt is whitespace only", async () => {
        await expect(generativeAIResponse("   ")).rejects.toThrow("Prompt cannot be empty");
    });

    it("propagates Gemini API errors", async () => {
        mockGenerateContent.mockRejectedValueOnce(new Error("API quota exceeded"));
        await expect(generativeAIResponse("test")).rejects.toThrow("API quota exceeded");
    });

    it("calls generateContent with the full prompt string", async () => {
        mockGenerateContent.mockResolvedValueOnce({
            response: { text: () => "ok" },
        });
        await generativeAIResponse("What is a pointer in C?");
        expect(mockGenerateContent).toHaveBeenCalledWith("What is a pointer in C?");
    });
});