// backend/src/__tests__/controllers/compile.controller.test.ts
// Key facts from actual source:
//   - submitCode(code, userLangId, input) — plain text, no base64
//   - output = "" unless status.description === "Accepted"
//   - response: { output, status, time }
//   - error response: { error: "Compilation Failed" }

jest.mock("../../middleware/auth.middleware", () => ({
    authenticate: (req: any, _res: any, next: any) => {
        req.user = { userId: "test-user-id", username: "testuser" };
        next();
    },
}));

import request from "supertest";
import express from "express";
import compileRoutes from "../../routes/compile.route";


jest.mock("../../services/judge0.service");
import { submitCode } from "../../services/judge0.service";
const mockSubmitCode = submitCode as jest.Mock;

const app = express();
app.use(express.json());
app.use("/compile", compileRoutes);

beforeEach(() => jest.clearAllMocks());

describe("POST /compile", () => {

    it("returns stdout when status is Accepted", async () => {
        mockSubmitCode.mockResolvedValueOnce({
            stdout: "Hello, World!\n",
            stderr: null,
            status: { id: 3, description: "Accepted" },
            time: "0.05",
        });

        const res = await request(app)
            .post("/compile")
            .send({ code: 'console.log("Hello, World!")', userLangId: 63, input: "" });

        expect(res.status).toBe(200);
        expect(res.body.output).toBe("Hello, World!\n");
        expect(res.body.status.description).toBe("Accepted");
        expect(res.body.time).toBe("0.05");
    });

    it("returns stderr when status is not Accepted", async () => {
        mockSubmitCode.mockResolvedValueOnce({
            stdout: "some stdout",
            stderr: "ReferenceError: x is not defined",
            status: { id: 11, description: "Runtime Error (NZEC)" },
            time: "0.01",
        });

        const res = await request(app)
            .post("/compile")
            .send({ code: "console.log(x)", userLangId: 63, input: "" });

        expect(res.status).toBe(200);
        expect(res.body.output).toBe("ReferenceError: x is not defined"); // ← stderr returned
        expect(res.body.status.description).toBe("Runtime Error (NZEC)");
    });

    it("returns compile_output for Compilation Error", async () => {
        mockSubmitCode.mockResolvedValueOnce({
            stdout: null,
            stderr: null,
            compile_output: "error: expected ';'",
            status: { id: 6, description: "Compilation Error" },
            time: null,
        });

        const res = await request(app)
            .post("/compile")
            .send({ code: "int main() { return 0 }", userLangId: 54, input: "" });

        expect(res.status).toBe(200);
        expect(res.body.output).toBe("error: expected ';'"); // ← compile_output returned
        expect(res.body.status.description).toBe("Compilation Error");
    });

    it("calls submitCode with correct args", async () => {
        mockSubmitCode.mockResolvedValueOnce({
            stdout: "42\n",
            status: { id: 3, description: "Accepted" },
            time: "0.1",
        });

        await request(app)
            .post("/compile")
            .send({ code: "print(42)", userLangId: 71, input: "some input" });

        expect(mockSubmitCode).toHaveBeenCalledWith("print(42)", 71, "some input");
    });

    it("returns 500 with { error } when Judge0 service throws", async () => {
        mockSubmitCode.mockRejectedValueOnce(new Error("Judge0 timeout"));

        const res = await request(app)
            .post("/compile")
            .send({ code: "int main(){}", userLangId: 54, input: "" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Compilation Failed");
    });

    it("passes empty input when not provided", async () => {
        mockSubmitCode.mockResolvedValueOnce({
            stdout: "ok\n",
            status: { id: 3, description: "Accepted" },
            time: "0.02",
        });

        await request(app)
            .post("/compile")
            .send({ code: "code", userLangId: 63 }); // no input field

        // input will be undefined — controller passes it through as-is
        expect(mockSubmitCode).toHaveBeenCalledWith("code", 63, "");
    });
});