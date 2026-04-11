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
    streamAIResponse: jest.fn(),
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
import { prisma } from "../../db/prisma";
import { streamAIResponse } from "../../services/ai.service";


const mockStream = streamAIResponse as jest.Mock;
const mockCreate    = prisma.aIMessage.create   as jest.Mock;
const mockFindMany  = prisma.aIMessage.findMany  as jest.Mock;
const mockDeleteMany = prisma.aIMessage.deleteMany as jest.Mock;


const app = express();
app.use(express.json());
app.use("/ai", aiRoutes);

beforeEach(() => jest.clearAllMocks());

// ── POST /ai/stream ─────────────────────────────────────────────────────────

async function* mockStreamGenerator() {
    yield "Hello ";
    yield "World";
}

describe("POST /ai/stream", () => {

    it("streams AI response and stores messages", async () => {
        mockStream.mockReturnValueOnce(mockStreamGenerator());

        mockCreate.mockResolvedValue({ id: "msg-1" });

        const res = await request(app)
            .post("/ai/stream")
            .send({ prompt: "hello", roomId: "room-123" });

        expect(res.status).toBe(200);

        // SSE header check
        expect(res.headers["content-type"]).toContain("text/event-stream");

        // Response should contain streamed chunks
        expect(res.text).toContain("Hello");
        expect(res.text).toContain("World");
        expect(res.text).toContain("done");

        // DB calls
        expect(mockCreate).toHaveBeenCalledTimes(2);

        // user message
        expect(mockCreate).toHaveBeenNthCalledWith(1, {
            data: {
                userId: "test-user-id",
                roomId: "room-123",
                role: "user",
                content: "hello",
            },
        });

        // ai message (final combined response)
        expect(mockCreate).toHaveBeenNthCalledWith(2, {
            data: {
                userId: "test-user-id",
                roomId: "room-123",
                role: "ai",
                content: "Hello World",
            },
        });
    });

    it("returns 400 when prompt is missing", async () => {
        const res = await request(app)
            .post("/ai/stream")
            .send({ roomId: "room-123" });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Validation failed");
    });

    it("handles AI stream error", async () => {
        async function* errorStream() {
            throw new Error("AI failed");
        }

        mockStream.mockReturnValueOnce(errorStream());
        mockCreate.mockResolvedValue({ id: "msg-1" });

        const res = await request(app)
            .post("/ai/stream")
            .send({ prompt: "test", roomId: "room-123" });

        expect(res.status).toBe(200); // still 200 (stream error handled inside)

        expect(res.text).toContain("error");
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
            where: { userId: "test-user-id" },
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
            where: { userId: "test-user-id" },
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