// src/__tests__/app.test.ts
// Integration tests that mount the full app — tests CORS, rate limiting,
// global error handler, and health check endpoint.

import jwt from "jsonwebtoken";

const TEST_TOKEN = jwt.sign(
    { userId: "test-user", username: "testuser" },
    "test-secret-key-for-jest", // matches envSetup.ts
    { expiresIn: "1h" }
);

jest.mock("../db/prisma", () => ({
    prisma: {
        aIMessage: { create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
        codeSnapshot: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
        room: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    },
}));

jest.mock("../services/ai.service", () => ({
    generativeAIResponse: jest.fn(),
}));

jest.mock("../services/judge0.service", () => ({
    submitCode: jest.fn(),
}));

jest.mock("../services/room.service", () => ({
    getOrCreateRoom: jest.fn(),
}));

import request from "supertest";
import app from "../app";

// ── GET /health ───────────────────────────────────────────────────────────────

describe("GET /health", () => {

    it("returns 200 with status ok", async () => {
        const res = await request(app).get("/health");

        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(res.body.timestamp).toBeDefined();
    });

    it("returns a valid ISO timestamp", async () => {
        const res = await request(app).get("/health");
        const parsed = new Date(res.body.timestamp);
        expect(parsed.toString()).not.toBe("Invalid Date");
    });
});

// ── CORS ──────────────────────────────────────────────────────────────────────

describe("CORS", () => {

    it("allows requests from allowed origin", async () => {
        const res = await request(app)
            .get("/health")
            .set("Origin", "http://localhost:5173");

        expect(res.status).toBe(200);
        expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    });

    it("blocks requests from disallowed origin", async () => {
        const res = await request(app)
            .get("/health")
            .set("Origin", "http://evil.com");

        // CORS error triggers global error handler → 500
        expect(res.status).toBe(500);
        expect(res.body.error).toContain("not allowed");
    });

    it("allows requests with no origin (curl, server-to-server)", async () => {
        const res = await request(app).get("/health"); // no Origin header
        expect(res.status).toBe(200);
    });
});

// ── Global error handler ──────────────────────────────────────────────────────

describe("Global error handler", () => {

    it("returns 500 with error message for unhandled errors", async () => {
        // CORS rejection triggers the global error handler
        const res = await request(app)
            .get("/health")
            .set("Origin", "http://attacker.com");

        expect(res.status).toBe(500);
        expect(res.body.error).toBeDefined();
        expect(typeof res.body.error).toBe("string");
    });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

describe("Rate limiting", () => {

    it("allows requests under the global rate limit", async () => {
        const res = await request(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.headers["ratelimit-limit"]).toBeDefined();
    });

    it("returns rate limit headers on every response", async () => {
        const res = await request(app).get("/health");
        // standardHeaders: true means these headers are present
        expect(res.headers["ratelimit-limit"]).toBeDefined();
        expect(res.headers["ratelimit-remaining"]).toBeDefined();
    });

    it("returns 429 with correct message when AI rate limit is exceeded", async () => {
        const { generativeAIResponse } = require("../services/ai.service");
        (generativeAIResponse as jest.Mock).mockResolvedValue("ok");

        const { prisma } = require("../db/prisma");
        prisma.aIMessage.create.mockResolvedValue({ id: "1" });

        // Send requests sequentially to ensure AI limiter fires before global limiter
        let aiLimitHit = false;
        for (let i = 0; i < 15; i++) {
            const res = await request(app)
                .post("/api/ai/generate")
                .set("Authorization", `Bearer ${TEST_TOKEN}`)
                .send({ prompt: "test", roomId: "room-1" });

            if (res.status === 429 && res.body.error === "AI rate limit reached. Try again in a minute.") {
                aiLimitHit = true;
                break;
            }
        }

        expect(aiLimitHit).toBe(true);
    });
});

// ── Helmet security headers ───────────────────────────────────────────────────

describe("Helmet security headers", () => {

    it("sets X-Content-Type-Options header", async () => {
        const res = await request(app).get("/health");
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });

    it("sets X-Frame-Options header", async () => {
        const res = await request(app).get("/health");
        expect(res.headers["x-frame-options"]).toBeDefined();
    });
});