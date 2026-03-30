import { io } from "socket.io-client";
const URL = import.meta.env.VITE_BACKEND_URL;

export const socket = io(URL ?? "http://localhost:8000", {
    autoConnect: false,
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnection: true,
    reconnectionDelay: 1000,
}); 