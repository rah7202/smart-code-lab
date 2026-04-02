import { Server } from "socket.io";
import { User, RoomPayload } from "../types";  
import { logger } from "../utils/logger";
import { prisma } from "../db/prisma"
import http from "http";
import jwt from "jsonwebtoken";
import { RoomParticipants } from "../store/roomParticipants";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required");

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

const RoomToUsers = new Map<string, Map<string, User>>(); 
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

    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;

            if (!token) return next(new Error("Unauthorized"));
            const decoded = jwt.verify(token, JWT_SECRET) as {userId: string; username: string};

            socket.data.user = {
                userId: decoded.userId,
                username: decoded.username,
            };
            next();

        } catch (error) {
            logger.warn("[SOCKET] Authentication failed", { error });
            next(new Error("Unauthorized"));
        }
    });
    
    io.on("connection", (socket) => {
        logger.info("[SOCKET] Client connected", { socketId: socket.id});
        
        // JOIN ROOM
        socket.on("join", async ({ RoomId }: { RoomId: string }) => {
        
            if (!RoomId) return;
            if (SocketToRoom.has(socket.id)) return;

            const user = socket.data.user; // ✅ from JWT
            if (!user) return;
            const userId = user.userId;
            const username = user.username;

            const roomExists = await prisma.room.findUnique({
                where: {
                    id: RoomId,
                },
                select: {
                    id: true
                }
            });

            if (!roomExists) {
                socket.emit("error", "Room does not exist");
                return;
            }

            socket.join(RoomId);
            SocketToRoom.set(socket.id, RoomId);

            // ROOM PARTICIPANTS
            if (!RoomParticipants.has(RoomId)) {
                RoomParticipants.set(RoomId, new Set());
            }
            RoomParticipants.get(RoomId)!.add(userId);

            let room = RoomToUsers.get(RoomId);

            if (!room) {
                room = new Map();
                RoomToUsers.set(RoomId, room);
            }

            const color = USER_COLORS[room.size % USER_COLORS.length] ?? "#4ECDCA";

            room.set(socket.id, { username, socketId: socket.id, color });
            SocketToColor.set(socket.id, color);

            const userArray = Array.from(room.values());
            io.to(RoomId).emit("users", userArray);

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

            RoomToContent.set(roomId, { code, language });

            // Broadcast code changes to others in the room
            socket.to(roomId).emit("content-edited", { code, language });
        });
        
        // CURSOR MOVEMENT
        socket.on("cursor-move", ({ line, column}: { line: number, column: number}) => {
            const roomId = SocketToRoom.get(socket.id);
            if (!roomId) return;

            const user = socket.data.user;
            const color = SocketToColor.get(socket.id) ?? "#4ECDCA";

            // broadcast to others in the room
            socket.to(roomId).emit("cursor-move", 
                {   line, 
                    column, 
                    username: user.username, 
                    color, 
                    socketId: socket.id 
                });
        });

        // DISCONNECT
        socket.on("disconnect", () => {
            const roomId = SocketToRoom.get(socket.id);

            if (roomId) {
                if (!socket.data.user) return;
                const user = socket.data.user;
                const userId = user?.userId;
                const room = RoomToUsers.get(roomId);

                // REMOVE FROM PARTICIPANTS
                if (userId) {
                    
                    const stillConnected = Array.from(room?.values() || [])
                            .some( u => u.username === user.username && u.socketId !== socket.id);
                    
                    if (!stillConnected) {
                        RoomParticipants.get(roomId)?.delete(userId);

                        if (RoomParticipants.get(roomId)?.size === 0) {
                            RoomParticipants.delete(roomId);
                        }
                    }
                }

                if (room) {
                    room.delete(socket.id);

                    const userArray = Array.from(room.values());
                    io.to(roomId).emit("users", userArray);

                    if (room.size === 0) {
                        RoomToUsers.delete(roomId);
                    }
                }

                SocketToRoom.delete(socket.id);
                SocketToColor.delete(socket.id);

                logger.info("[SOCKET] User disconnected", { socketId: socket.id, roomId });
            }
        });

    });

    return io;
};