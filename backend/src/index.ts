import dotenv from "dotenv";
dotenv.config({
    path: "./.env"
});
//console.log("ENV TEST:", process.env.GEMINI_API_KEY);

import http from "http";
import app from "./app";

import { initSocket } from "./sockets/socket";

const PORT = 8000;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
