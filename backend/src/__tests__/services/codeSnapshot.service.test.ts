jest.mock("../../db/prisma", () => ({
    prisma: {
        codeSnapshot: {
            create:    jest.fn(),
            findFirst: jest.fn(),
            findMany:  jest.fn(),
        },
    },
}));

jest.mock("../../middleware/auth.middleware", () => ({
    authenticate: (req: any, _res: any, next: any) => {
        req.user = { userId: "test-user-id", username: "testuser" };
        next();
    },
}));


import request from "supertest";
import express from "express";
import snapshotRoutes from "../../routes/codeSnapshot.routes";
import { prisma } from "../../db/prisma";
import { saveCodeSnapshot } from "../../services/codeSnapshot.service";

const mockCreate    = prisma.codeSnapshot.create    as jest.Mock;
const mockFindFirst = prisma.codeSnapshot.findFirst as jest.Mock;
const mockFindMany  = prisma.codeSnapshot.findMany  as jest.Mock;

// Mount snapshot routes correctly matching actual route definitions
// codeSnapshot.routes defines POST /:roomId and GET /:roomId
// so we mount at /snapshot for POST and /snapshots for GET
const app = express();
app.use(express.json());
app.use("/snapshot", snapshotRoutes);   // POST /snapshot/:roomId
app.use("/snapshots", snapshotRoutes);  // GET  /snapshots/:roomId

beforeEach(() => jest.clearAllMocks());

// ── codeSnapshot.service — saveCodeSnapshot ───────────────────────────────────

describe("codeSnapshot.service — saveCodeSnapshot", () => {

    it("creates snapshot when no previous snapshot exists", async () => {
        mockFindFirst.mockResolvedValueOnce(null);
        const created = { id: "snap-1", roomId: "room-123", code: "print('hi')", language: "python", createdAt: new Date() };
        mockCreate.mockResolvedValueOnce(created);

        const result = await saveCodeSnapshot("room-123", "print('hi')", "python");

        expect(mockCreate).toHaveBeenCalledWith({
            data: { roomId: "room-123", code: "print('hi')", language: "python" },
        });
        expect(result).toEqual(created);
    });

    it("creates snapshot when code has changed", async () => {
        mockFindFirst.mockResolvedValueOnce({ id: "snap-0", code: "old code", language: "python", createdAt: new Date() });
        mockCreate.mockResolvedValueOnce({ id: "snap-1" });

        await saveCodeSnapshot("room-123", "new code", "python");
        expect(mockCreate).toHaveBeenCalled();
    });

    it("creates snapshot when language changed even if code is same", async () => {
        mockFindFirst.mockResolvedValueOnce({ id: "snap-0", code: "print('hi')", language: "python", createdAt: new Date() });
        mockCreate.mockResolvedValueOnce({ id: "snap-1" });

        await saveCodeSnapshot("room-123", "print('hi')", "javascript");
        expect(mockCreate).toHaveBeenCalled();
    });

    it("skips creating when code AND language are identical to last snapshot", async () => {
        mockFindFirst.mockResolvedValueOnce({ id: "snap-0", code: "print('hi')", language: "python", createdAt: new Date() });

        const result = await saveCodeSnapshot("room-123", "print('hi')", "python");

        expect(mockCreate).not.toHaveBeenCalled();
        expect(result).toBeUndefined();
    });

    it("queries the latest snapshot ordered by createdAt desc", async () => {
        mockFindFirst.mockResolvedValueOnce(null);
        mockCreate.mockResolvedValueOnce({ id: "snap-1" });

        await saveCodeSnapshot("room-123", "code", "javascript");

        expect(mockFindFirst).toHaveBeenCalledWith({
            where: { roomId: "room-123" },
            orderBy: { createdAt: "desc" },
        });
    });

    it("propagates DB errors from findFirst", async () => {
        mockFindFirst.mockRejectedValueOnce(new Error("DB error"));
        await expect(saveCodeSnapshot("room-123", "code", "javascript")).rejects.toThrow("DB error");
    });
});

// ── POST /snapshot/:roomId ────────────────────────────────────────────────────

describe("POST /snapshot/:roomId — saveSnapshotController", () => {

    it("creates snapshot and returns { success: true }", async () => {
        mockCreate.mockResolvedValueOnce({ id: "snap-1" });

        const res = await request(app)
            .post("/snapshot/room-123")
            .send({ code: 'console.log("hi")', language: "javascript" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockCreate).toHaveBeenCalledWith({
            data: { roomId: "room-123", code: 'console.log("hi")', language: "javascript" },
        });
    });

    it("returns 500 with { error } when DB create throws", async () => {
        mockCreate.mockRejectedValueOnce(new Error("DB error"));

        const res = await request(app)
            .post("/snapshot/room-err")
            .send({ code: "code", language: "javascript" });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Failed to save snapshot");
    });

    it("stores the language and code passed in body", async () => {
        mockCreate.mockResolvedValueOnce({ id: "snap-2" });

        await request(app)
            .post("/snapshot/room-abc")
            .send({ code: "#include<stdio.h>", language: "c" });

        expect(mockCreate).toHaveBeenCalledWith({
            data: { roomId: "room-abc", code: "#include<stdio.h>", language: "c" },
        });
    });
});

// ── GET /snapshots/:roomId ────────────────────────────────────────────────────

describe("GET /snapshots/:roomId — getSnapshotsController", () => {

    it("returns snapshots ordered by createdAt desc", async () => {
        const snapshots = [
            { id: "snap-2", roomId: "room-123", code: "v2", language: "python", createdAt: new Date() },
            { id: "snap-1", roomId: "room-123", code: "v1", language: "python", createdAt: new Date() },
        ];
        mockFindMany.mockResolvedValueOnce(snapshots);

        const res = await request(app).get("/snapshots/room-123");

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].id).toBe("snap-2");
        expect(mockFindMany).toHaveBeenCalledWith({
            where: { roomId: "room-123" },
            orderBy: { createdAt: "desc" },
        });
    });

    it("returns empty array when no snapshots exist", async () => {
        mockFindMany.mockResolvedValueOnce([]);
        const res = await request(app).get("/snapshots/empty-room");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it("returns 500 with { error } when DB throws", async () => {
        mockFindMany.mockRejectedValueOnce(new Error("DB error"));
        const res = await request(app).get("/snapshots/room-err");
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Failed to fetch snapshots");
    });
});