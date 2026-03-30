// backend/src/__tests__/middleware/validate.middleware.test.ts

import request from "supertest";
import express from "express";
import { validate, compileSchema, aiGenerateSchema, roomSaveSchema, snapshotSchema } from "../../middleware/validate";
import { ZodSchema } from "zod";

// Minimal test app that applies the middleware then echoes req.body
function makeApp(schema: ZodSchema) {
    const app = express();
    app.use(express.json());
    app.post("/test", validate(schema), (req, res) => {
        res.json({ received: req.body });
    });
    return app;
}

describe("validate middleware — compileSchema", () => {
    const app = makeApp(compileSchema);

    it("passes valid compile body through", async () => {
        const res = await request(app)
            .post("/test")
            .send({ code: 'print("hi")', userLangId: 71, input: "some input" });

        expect(res.status).toBe(200);
        expect(res.body.received.code).toBe('print("hi")');
    });

    it("defaults input to empty string when omitted", async () => {
        const res = await request(app)
            .post("/test")
            .send({ code: 'print("hi")', userLangId: 71 });

        expect(res.status).toBe(200);
        expect(res.body.received.input).toBe("");
    });

    it("rejects empty code", async () => {
        const res = await request(app)
            .post("/test")
            .send({ code: "", userLangId: 71 });

        expect(res.status).toBe(400);
        expect(res.body.issues[0].field).toBe("code");
    });

    it("rejects missing userLangId", async () => {
        const res = await request(app)
            .post("/test")
            .send({ code: "int main(){}" });

        expect(res.status).toBe(400);
        expect(res.body.issues[0].field).toBe("userLangId");
    });

    it("rejects code over 50k chars", async () => {
        const res = await request(app)
            .post("/test")
            .send({ code: "x".repeat(50_001), userLangId: 54 });

        expect(res.status).toBe(400);
    });
});

describe("validate middleware — aiGenerateSchema", () => {
    const app = makeApp(aiGenerateSchema);

    it("passes valid prompt", async () => {
        const res = await request(app)
            .post("/test")
            .send({ prompt: "Explain recursion" });

        expect(res.status).toBe(200);
    });

    it("rejects missing prompt", async () => {
        const res = await request(app).post("/test").send({});
        expect(res.status).toBe(400);
    });

    it("rejects prompt over 20k chars", async () => {
        const res = await request(app)
            .post("/test")
            .send({ prompt: "x".repeat(20_001) });
        expect(res.status).toBe(400);
    });
});

describe("validate middleware — roomSaveSchema", () => {
    const app = makeApp(roomSaveSchema);

    it("passes valid language values", async () => {
        for (const lang of ["javascript", "python", "cpp", "c"]) {
            const res = await request(app)
                .post("/test")
                .send({ code: "// code", language: lang });
            expect(res.status).toBe(200);
        }
    });

    it("rejects invalid language", async () => {
        const res = await request(app)
            .post("/test")
            .send({ code: "// code", language: "rust" });

        expect(res.status).toBe(400);
        expect(res.body.issues[0].field).toBe("language");
    });
});

describe("validate middleware — snapshotSchema", () => {
    const app = makeApp(snapshotSchema);

    it("passes valid snapshot body", async () => {
        const res = await request(app)
            .post("/test")
            .send({ code: "print('hi')", language: "python" });

        expect(res.status).toBe(200);
        expect(res.body.received.code).toBe("print('hi')");
        expect(res.body.received.language).toBe("python");
    });

    it("passes all valid language values", async () => {
        for (const lang of ["javascript", "python", "cpp", "c"]) {
            const res = await request(app)
                .post("/test")
                .send({ code: "// code", language: lang });
            expect(res.status).toBe(200);
        }
    });

    it("rejects invalid language", async () => {
        const res = await request(app)
            .post("/test")
            .send({ code: "// code", language: "ruby" });

        expect(res.status).toBe(400);
        expect(res.body.issues[0].field).toBe("language");
    });

    it("rejects code over 50k chars", async () => {
        const res = await request(app)
            .post("/test")
            .send({ code: "x".repeat(50_001), language: "javascript" });

        expect(res.status).toBe(400);
    });

    it("passes empty code string", async () => {
        // snapshot allows empty code (user cleared the editor)
        const res = await request(app)
            .post("/test")
            .send({ code: "", language: "javascript" });

        expect(res.status).toBe(200);
    });
});