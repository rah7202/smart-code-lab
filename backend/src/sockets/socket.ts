import { Server } from "socket.io";
import { User, RoomPayload } from "../types";  
import { logger } from "../utils/logger";
import { prisma } from "../db/prisma"
import http from "http";
import jwt from "jsonwebtoken";

import { redis, redisSub } from "../db/redis";
import  { createAdapter } from "@socket.io/redis-adapter";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required");

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

const USER_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
    "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F" ];

interface ParsedUser { 
    userId: string; 
    socketId: string; 
    username: string; 
    color: string; 
}

export const initSocket = (server: http.Server) => {
    const io = new Server(server, {
        cors: {
            origin: ALLOWED_ORIGINS,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.adapter(createAdapter(redis, redisSub));

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
            const existingRoom = await redis.get(`socket:${socket.id}:room`);
            if (existingRoom) return;
            
            const user = socket.data.user; // from JWT
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
            await redis.set(`socket:${socket.id}:room`, RoomId);

            const usersKey = `room:${RoomId}:users`;

            // get existing users
            const existingUsers = await redis.hGetAll(usersKey);
            const userCount = Object.keys(existingUsers).length;

            // assign color
            const color = USER_COLORS[userCount % USER_COLORS.length] ?? "#4ECDCA";
            
            // store user
            await redis.hSet(
                usersKey,
                socket.id,
                JSON.stringify({ username, socketId: socket.id, userId, color })
            );

            // fetch updated users
            const updatedUsers = await redis.hGetAll(usersKey);

            const userArray = Object.values(updatedUsers)
                .map((u) => {
                    try { return JSON.parse(u); } catch { return null; }
                })
                .filter(Boolean);

            const uniqueUsersMap = new Map();

            for (const user of userArray) {
                if (!uniqueUsersMap.has(user.userId)) {
                    uniqueUsersMap.set(user.userId, user);
                }
            }

            const uniqueUsers = Array.from(uniqueUsersMap.values());

            // emit
            io.to(RoomId).emit("users", uniqueUsers);
          
            const contentStr = await redis.get(`room:${RoomId}:content`);

            if (contentStr) {
                try {
                    const content = JSON.parse(contentStr);
                    if (content?.code) {
                        socket.emit("code-sync", content.code);
                    }
                } catch {
                    //ignore parse error
                }
            }

            logger.info("[SOCKET] User joined room", { socketId: socket.id, RoomId, username });
        });

        // CODE EDITOR
        socket.on("content-edited", async ({ code, language }: RoomPayload) => {
            const roomId = await redis.get(`socket:${socket.id}:room`);
            if (!roomId) return;
   
            await redis.set(
                `room:${roomId}:content`,
                JSON.stringify({ code, language})
            );

            // Broadcast code changes to others in the room
            socket.to(roomId).emit("content-edited", { code, language });
        });
        
        // CURSOR MOVEMENT
        socket.on("cursor-move", async ({ line, column}: { line: number, column: number}) => {
        
            const roomId = await redis.get(`socket:${socket.id}:room`);
            if (!roomId) return;

            const user = socket.data.user;
            
            const userStr = await redis.hGet(`room:${roomId}:users`, socket.id);
            let color = "#4ECDCA"

            if (userStr) {
                try {
                    color = JSON.parse(userStr).color;
                } catch {}
            }

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
        socket.on("disconnect", async () => {
            
            const roomId = await redis.get(`socket:${socket.id}:room`);

            if (roomId) {
                if (!socket.data.user) return;
                const user = socket.data.user;
                const userId = user?.userId;
                const usersKey = `room:${roomId}:users`;

                // REMOVE FROM PARTICIPANTS
                if (userId) {
                    
                    // remove user
                    await redis.hDel(usersKey, socket.id);
                    
                    // get remaining users
                    const remainingUsers = await redis.hGetAll(usersKey);

                    const parsedUsers : ParsedUser[] = Object.values(remainingUsers)
                        .map((u) => {
                            try { return JSON.parse(u); } catch { return null; }
                        })
                        .filter(Boolean);
  
                    const uniqueUsersMap = new Map();

                    for (const u of parsedUsers) {
                        if (!uniqueUsersMap.has(u.userId)) {
                            uniqueUsersMap.set(u.userId, u);
                        }
                    }

                    const uniqueUsers = Array.from(uniqueUsersMap.values());
                    
                    // emit users
                    io.to(roomId).emit("users", uniqueUsers);

                    if (parsedUsers.length === 0) {
                        await redis.del(usersKey);
                    }
                }

                await redis.del(`socket:${socket.id}:room`);
                logger.info("[SOCKET] User disconnected", { socketId: socket.id, roomId });
            }
        });
    });

    return io;
};