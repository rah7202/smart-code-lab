jest.mock("../../db/prisma", () => ({
    prisma: {
        aIMessage: {
            create: jest.fn(),
            findMany: jest.fn(),
            deleteMany: jest.fn(),
        },
    },
}));

jest.mock("../../services/ai.service", () => ({
    generativeAIResponse: jest.fn(),
}));

jest.mock("../../middleware/auth.middleware", () => ({
    authenticate: (req: any, _res: any, next: any) => {
        req.user = { userId: "test-user-id", username: "testuser" };
        next();
    },
}));

import request from "supertest";
import express from "express";
import aiRoutes from "../../routes/ai.route";
import { generativeAIResponse } from "../../services/ai.service";
import { prisma } from "../../db/prisma";

const mockAIResponse = generativeAIResponse as jest.Mock;
const mockCreate    = prisma.aIMessage.create   as jest.Mock;
const mockFindMany  = prisma.aIMessage.findMany  as jest.Mock;
const mockDeleteMany = prisma.aIMessage.deleteMany as jest.Mock;


const app = express();
app.use(express.json());
app.use("/ai", aiRoutes);

beforeEach(() => jest.clearAllMocks());

// ── POST /ai/generate ─────────────────────────────────────────────────────────

describe("POST /ai/generate", () => {

    it("returns AI response and creates two DB messages (user + ai)", async () => {
        mockCreate.mockResolvedValue({ id: "msg-1" });
        mockAIResponse.mockResolvedValueOnce("Recursion is when a function calls itself.");

        const res = await request(app)
            .post("/ai/generate")
            .send({ prompt: "Explain recursion", roomId: "room-123" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBe("Recursion is when a function calls itself.");
        expect(mockCreate).toHaveBeenCalledTimes(2);
        expect(mockCreate).toHaveBeenNthCalledWith(1, {
            data: { roomId: "room-123", role: "user", content: "Explain recursion" },
        });
        expect(mockCreate).toHaveBeenNthCalledWith(2, {
            data: { roomId: "room-123", role: "ai", content: "Recursion is when a function calls itself." },
        });
    });

    it("returns 400 when prompt is missing", async () => {
        const res = await request(app)
            .post("/ai/generate")
            .send({ roomId: "room-123" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Validation failed");
        expect(mockAIResponse).not.toHaveBeenCalled();
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("returns 400 when prompt is falsy (empty string)", async () => {
        const res = await request(app)
            .post("/ai/generate")
            .send({ prompt: "", roomId: "room-123" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Validation failed");
    });

    it("returns 500 when Gemini throws", async () => {
        mockCreate.mockResolvedValueOnce({ id: "msg-1" });
        mockAIResponse.mockRejectedValueOnce(new Error("Gemini quota exceeded"));

        const res = await request(app)
            .post("/ai/generate")
            .send({ prompt: "test", roomId: "room-123" });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe("Failed to generate response");
    });

    it("returns 500 when first prisma.create fails", async () => {
        mockCreate.mockRejectedValueOnce(new Error("DB connection lost"));

        const res = await request(app)
            .post("/ai/generate")
            .send({ prompt: "test", roomId: "room-123" });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});

// ── GET /ai/history/:roomId ───────────────────────────────────────────────────

describe("GET /ai/history/:roomId", () => {

    it("returns messages ordered by createdAt asc", async () => {
        const messages = [
            { id: "1", roomId: "room-123", role: "user", content: "hello", createdAt: new Date() },
            { id: "2", roomId: "room-123", role: "ai",   content: "hi",    createdAt: new Date() },
        ];
        mockFindMany.mockResolvedValueOnce(messages);

        const res = await request(app).get("/ai/history/room-123");

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].role).toBe("user");
        expect(mockFindMany).toHaveBeenCalledWith({
            where: { roomId: "room-123" },
            orderBy: { createdAt: "asc" },
        });
    });

    it("returns empty array when no history", async () => {
        mockFindMany.mockResolvedValueOnce([]);
        const res = await request(app).get("/ai/history/empty-room");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it("returns 500 when DB throws", async () => {
        mockFindMany.mockRejectedValueOnce(new Error("DB error"));
        const res = await request(app).get("/ai/history/room-err");
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Failed to fetch AI history");
    });
});

// ── DELETE /ai/history/:roomId ────────────────────────────────────────────────

describe("DELETE /ai/history/:roomId", () => {

    it("deletes all messages for a room and returns { success: true }", async () => {
        mockDeleteMany.mockResolvedValueOnce({ count: 5 });

        const res = await request(app).delete("/ai/history/room-123");

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockDeleteMany).toHaveBeenCalledWith({
            where: { roomId: "room-123" },
        });
    });

    it("returns 200 even when 0 messages were deleted", async () => {
        mockDeleteMany.mockResolvedValueOnce({ count: 0 });
        const res = await request(app).delete("/ai/history/no-messages");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it("returns 500 when DB throws", async () => {
        mockDeleteMany.mockRejectedValueOnce(new Error("DB error"));
        const res = await request(app).delete("/ai/history/room-err");
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Failed to clear history");
    });
});