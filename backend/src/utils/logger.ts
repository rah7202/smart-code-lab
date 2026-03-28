import { Level } from "../types";

const LEVELS: Record<Level, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const currentLevel: Level = (process.env.LOG_LEVEL as Level) ?? "info";

function log(level: Level, message: string, meta?: Record<string, unknown>) {
    if (LEVELS[level] < LEVELS[currentLevel]) return;

    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(meta ?? {}),
    };

    const output = JSON.stringify(entry);
    if (level === "error" || level === "warn") {
        process.stderr.write(output + "\n");
    } else {
        process.stdout.write(output + "\n");
    }
}

export const logger = {
    debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
    info:  (msg: string, meta?: Record<string, unknown>) => log("info",  msg, meta),
    warn:  (msg: string, meta?: Record<string, unknown>) => log("warn",  msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
};