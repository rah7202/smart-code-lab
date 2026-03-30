import dotenv from "dotenv";
import { logger } from "./utils/logger";
dotenv.config({
    path: "./.env"
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
