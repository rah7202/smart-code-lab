import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/src"],
    testMatch: ["**/__tests__/**/*.test.ts"],
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/index.ts",
        "!src/db/prisma.ts",
        "!src/**/*.d.ts",
        "!src/sockets/socket.ts",  // untestable in unit tests
    ],
    coverageThreshold: {
        global: {
            lines: 70,
            functions: 70,
        },
    },
    // ✅ removed moduleNameMapper — inline jest.mock() handles prisma mocking
    setupFilesAfterEnv: [],
    clearMocks: true,
};

export default config;