import { createClient } from "redis";
import { logger } from "../utils/logger";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = createClient({ url: REDIS_URL });
export const redisSub = redis.duplicate();

redis.on("error", (err) => logger.error("Redis client error", { error: err.message }));
redis.on("connect", () => logger.info("Redis connected"));

export async function connectRedis() {
    await redis.connect();
    await redisSub.connect();
}
