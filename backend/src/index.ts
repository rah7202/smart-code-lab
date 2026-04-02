import dotenv from "dotenv";
import { logger } from "./utils/logger";

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";

dotenv.config({
    path: envFile
});

import http from "http";
import app from "./app";

import { initSocket } from "./sockets/socket";

const PORT = 8000;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`);
});
