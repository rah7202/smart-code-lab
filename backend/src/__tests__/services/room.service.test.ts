jest.mock("../../db/prisma", () => ({
    prisma: {
        room: {
            findUnique: jest.fn(),
            create:     jest.fn(),
            update:     jest.fn(),
        },
    },
}));

jest.mock("../../services/room.service", () => ({
    getOrCreateRoom: jest.fn(),
}));

import request from "supertest";
import express from "express";
import roomRoutes from "../../routes/room.route";
import { getOrCreateRoom } from "../../services/room.service";
import { prisma } from "../../db/prisma";

const mockGetOrCreate = getOrCreateRoom as jest.Mock;
const mockUpdate      = prisma.room.update     as jest.Mock;
const mockFindUnique  = prisma.room.findUnique as jest.Mock;
const mockCreate      = prisma.room.create     as jest.Mock;

const app = express();
app.use(express.json());
app.use("/", roomRoutes);

beforeEach(() => jest.clearAllMocks());

// ── room.service unit tests ───────────────────────────────────────────────────

describe("room.service — getOrCreateRoom", () => {

    const { getOrCreateRoom: realGetOrCreate } =
        jest.requireActual("../../services/room.service");

    it("returns existing room when found", async () => {
        const existing = {
            id: "room-123",
            code: 'console.log("hi")',
            language: "javascript",
            createdAt: new Date(),
        };
        mockFindUnique.mockResolvedValueOnce(existing);

        const result = await realGetOrCreate("room-123");

        expect(result).toEqual(existing);
        expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "room-123" } });
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it("creates new room with empty code + javascript when not found", async () => {
        mockFindUnique.mockResolvedValueOnce(null);
        const created = { id: "room-new", code: "", language: "javascript", createdAt: new Date() };
        mockCreate.mockResolvedValueOnce(created);

        const result = await realGetOrCreate("room-new");

        expect(mockCreate).toHaveBeenCalledWith({
            data: { id: "room-new", language: "javascript", code: "" },
        });
        expect(result.id).toBe("room-new");
        expect(result.code).toBe("");
    });

    it("propagates DB errors", async () => {
        mockFindUnique.mockRejectedValueOnce(new Error("DB down"));
        await expect(realGetOrCreate("room-err")).rejects.toThrow("DB down");
    });
});

// ── GET /room/:roomId — getRoomData ───────────────────────────────────────────

describe("GET /room/:roomId — getRoomData", () => {

    it("returns roomId, language, code when room exists", async () => {
        mockGetOrCreate.mockResolvedValueOnce({
            id: "room-123",
            code: 'console.log("hi")',
            language: "javascript",
            createdAt: new Date(),
        });

        const res = await request(app).get("/room-123");

        expect(res.status).toBe(200);
        expect(res.body.roomId).toBe("room-123");
        expect(res.body.language).toBe("javascript");
        expect(res.body.code).toBe('console.log("hi")');
    });

    it("creates and returns new room if not found", async () => {
        mockGetOrCreate.mockResolvedValueOnce({
            id: "room-new",
            code: "",
            language: "javascript",
            createdAt: new Date(),
        });

        const res = await request(app).get("/room-new");

        expect(res.status).toBe(200);
        expect(res.body.roomId).toBe("room-new");
        expect(res.body.code).toBe("");
    });

    it("returns 500 with { error } when service throws", async () => {
        mockGetOrCreate.mockRejectedValueOnce(new Error("DB connection lost"));

        const res = await request(app).get("/room-err");

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Failed to load room");
    });
});

// ── POST /room/:roomId/save — saveRoomCode ────────────────────────────────────

describe("POST /:roomId/save — saveRoomCode", () => {

    it("updates room and returns { success: true }", async () => {
        mockUpdate.mockResolvedValueOnce({
            id: "room-123", code: "print('hi')", language: "python", createdAt: new Date(),
        });

        const res = await request(app)
            .post("/room-123/save")
            .send({ code: "print('hi')", language: "python" }); // ✅ valid enum value

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: "room-123" },
            data: { code: "print('hi')", language: "python" },
        });
    });

    it("returns 500 with { error } when DB update fails", async () => {
        mockUpdate.mockRejectedValueOnce(new Error("Record not found"));

        const res = await request(app)
            .post("/room-123/save")
            .send({ code: "code", language: "javascript" }); // ✅ valid enum value

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Failed to save room");
    });

    it("returns 400 when language is invalid", async () => {
        const res = await request(app)
            .post("/room-123/save")
            .send({ code: "code", language: "ruby" }); // ❌ not in enum

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Validation failed");
    });
});