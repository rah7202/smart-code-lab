import { vi } from "vitest";

export const socket = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    io: {
        opts: {
            query: {},
        },
    },
};