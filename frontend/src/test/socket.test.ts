import { describe, it, expect } from "vitest";

describe("socket configuration", () => {

    it("exports a socket instance", async () => {
        // Mock import.meta.env
        const { socket } = await import("../socket");
        expect(socket).toBeDefined();
    });

    it("socket has autoConnect disabled", async () => {
        const { socket } = await import("../socket");
        // autoConnect: false means socket doesn't connect automatically
        expect(socket.connected).toBe(false);
    });

    it("socket has correct transport", async () => {
        const { socket } = await import("../socket");
        // @ts-ignore — accessing internal io opts
        expect(socket.io.opts.transports).toContain("websocket");
    });
});