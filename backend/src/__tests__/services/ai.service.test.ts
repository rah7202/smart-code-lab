// backend/src/__tests__/services/ai.service.test.ts


const mockGenerateContentStream = jest.fn();

jest.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: () => ({
            generateContentStream: mockGenerateContentStream,
        }),
    })),
}));


import { streamAIResponse } from "../../services/ai.service";


describe("ai.service — streamAIResponse", () => {

    it("yields chunks from Gemini stream", async () => {
        const mockStream = async function* () {
            yield { text: () => "Hello " };
            yield { text: () => "World" };
        };

        mockGenerateContentStream.mockResolvedValue({
            stream: mockStream(),
        });

        const chunks = [];

        for await (const chunk of streamAIResponse("hello world")) {
            chunks.push(chunk);
        }

        expect(chunks).toEqual(["Hello ", "World"]);
    });
    
    it("throws when prompt is empty", async () => {
        const gen = streamAIResponse("");
        await expect(gen.next()).rejects.toThrow("Prompt cannot be empty");
    });
});

