import { Server } from "socket.io";
import { User, JoinRoomPayload, RoomPayload } from "../types";  
import { logger } from "../utils/logger";
import http from "http";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

const RoomToUsers = new Map<string, User[]>();
const RoomToContent = new Map<string, RoomPayload>();
const SocketToRoom = new Map<string, string>();
const SocketToColor = new Map<string, string>();


const USER_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
    "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"
];

export const initSocket = (server: http.Server) => {
    const io = new Server(server, {
        cors: {
            origin: ALLOWED_ORIGINS,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    
    io.on("connection", (socket) => {
        logger.info("[SOCKET] Client connected", { socketId: socket.id});
        
        // JOIN ROOM
        socket.on("join", ({ RoomId, username }: JoinRoomPayload) => {
            if (!RoomId || !username) {
                logger.warn("[SOCKET] join called with missing fields", { socketId: socket.id});
                return;
            }

            socket.join(RoomId);
            SocketToRoom.set(socket.id, RoomId); 
            
            
            const existing = RoomToUsers.get(RoomId) ?? [];
            const color = USER_COLORS[existing.length % USER_COLORS.length] ?? "#4ECDC4";
            const updated = [...existing, {username, color, socketId: socket.id}];
            RoomToUsers.set(RoomId, updated as User[]);
            SocketToColor.set(socket.id, color);

            io.to(RoomId).emit("users", updated);

            const content = RoomToContent.get(RoomId);
            if (content?.code) {
                socket.emit("code-sync", content.code);
            }

            logger.info("[SOCKET] User joined room", { socketId: socket.id, RoomId, username });
        });

        // CODE EDITOR
        socket.on("content-edited", ({ code, language }: RoomPayload) => {
            const roomId = SocketToRoom.get(socket.id);
            if (!roomId) return;

            const prev = RoomToContent.get(roomId);
            RoomToContent.set(roomId, { code, language });

            // Broadcast code changes to others in the room
            socket.to(roomId).emit("content-edited", { code, language });
        });
        
        // CURSOR MOVEMENT
        socket.on("cursor-move", ({ line, column, username, color }: { line: number, column: number, username: string, color: string }) => {
            const roomId = SocketToRoom.get(socket.id);
            if (!roomId) return;

            // broadcast to others in the room
            socket.to(roomId).emit("cursor-move", { line, column, username, color, socketId: socket.id })
        });

        // DISCONNECT
        socket.on("disconnect", () => {
            const roomId = SocketToRoom.get(socket.id);

            if (roomId) {
                const users = (RoomToUsers.get(roomId) ?? []).filter((u) => u.socketId !== socket.id);
                RoomToUsers.set(roomId, users);
                io.to(roomId).emit("users", users);
                SocketToRoom.delete(socket.id);
                SocketToColor.delete(socket.id);

                logger.info("[SOCKET] User disconnected", { socketId: socket.id, roomId });
            }
        });
    });

    return io;
};