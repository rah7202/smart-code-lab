import { io } from "socket.io-client";
const URL = import.meta.env.VITE_BACKEND_URL;

export const socket = io(URL , {
    autoConnect: false,
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnection: true,
    reconnectionDelay: 1000,
    auth: {
        token: localStorage.getItem("token"),
    }
}); 

// Call this after login before connecting
export const connectSocket = () => {
    socket.auth = { token: localStorage.getItem("token") };
    socket.connect();
};