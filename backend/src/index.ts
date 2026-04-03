import dotenv from "dotenv";
import { logger } from "./utils/logger";

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";

dotenv.config({
    path: envFile
});

import http from "http";
import app from "./app";
import { initSocket } from "./sockets/socket";
import { connectRedis } from "./db/redis";

const PORT = 8000;

async function startServer () {
    try {

        await connectRedis();
        const server = http.createServer(app);
        initSocket(server);

        server.listen(PORT, () => {
            logger.info(`Server started on port ${PORT}`);
        });
    } catch (error) {

        logger.error("Failed to start server", { error });
        process.exit(1);
    }
}

startServer();