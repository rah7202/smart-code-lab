// backend/src/__tests__/services/judge0.service.test.ts
// judge0.service.ts sends plain text (base64_encoded=false)
// params: source_code, language_id, stdin  (NOT encoded)
// URL: https://ce.judge0.com (public, no API key needed)

jest.mock("axios");

import axios from "axios";
import { submitCode } from "../../services/judge0.service";

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("judge0.service — submitCode", () => {

    const acceptedResult = {
        stdout: "Hello, World!\n",
        stderr: null,
        status: { id: 3, description: "Accepted" },
        time: "0.042",
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns accepted result for valid submission", async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: acceptedResult });

        const result = await submitCode('console.log("Hello")', 63, "");

        expect(result.status.description).toBe("Accepted");
        expect(result.stdout).toBe("Hello, World!\n");
    });

    it("sends correct plain-text params (no base64 encoding)", async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: acceptedResult });

        const code = 'print("hi")';
        const input = "some input";
        await submitCode(code, 71, input);

        const body = mockedAxios.post.mock.calls[0]?.[1] as any;
        // These must be the raw strings — NOT base64 encoded
        expect(body.source_code).toBe(code);
        expect(body.stdin).toBe(input);
        expect(body.language_id).toBe(71);
    });

    it("hits the correct public Judge0 URL", async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: acceptedResult });

        await submitCode("code", 63, "");

        const url = mockedAxios.post.mock.calls[0]?.[0] as string;
        expect(url).toContain("ce.judge0.com/submissions");
        expect(url).toContain("base64_encoded=false");
        expect(url).toContain("wait=true");
    });

    it("passes correct language_id for C++ (54)", async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: acceptedResult });

        await submitCode("int main(){}", 54, "");

        const body = mockedAxios.post.mock.calls[0]?.[1] as any;
        expect(body.language_id).toBe(54);
    });

    it("handles compilation error status", async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                stdout: null,
                stderr: null,
                compile_output: "syntax error near $$",
                status: { id: 6, description: "Compilation Error" },
                time: null,
            },
        });

        const result = await submitCode("invalid $$", 63, "");
        expect(result.status.description).toBe("Compilation Error");
        expect(result.stdout).toBeNull();
    });

    it("handles runtime error status", async () => {
        mockedAxios.post.mockResolvedValueOnce({
            data: {
                stdout: null,
                stderr: "ReferenceError: x is not defined",
                status: { id: 11, description: "Runtime Error (NZEC)" },
                time: "0.01",
            },
        });

        const result = await submitCode("console.log(x)", 63, "");
        expect(result.status.description).toBe("Runtime Error (NZEC)");
    });

    it("throws when Judge0 API call fails", async () => {
        mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));
        await expect(submitCode("code", 63, "")).rejects.toThrow("Network error");
    });

    it("passes empty stdin when input is empty string", async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: acceptedResult });

        await submitCode("code", 63, "");

        const body = mockedAxios.post.mock.calls[0]?.[1] as any;
        expect(body.stdin).toBe("");
    });
});
