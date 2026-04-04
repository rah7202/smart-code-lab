import { Response } from "express";
import { prisma } from "../db/prisma";
import { makeRoom, createRoom as createRoomService } from "../services/room.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { redis } from "../db/redis";
// import { RoomParticipants } from "../store/roomParticipants";

//  GET ROOM DATA
export const getRoomData = async (req: AuthRequest, res: Response) => {
    const { roomId } = req.params;

    try {
        const userId = req.user?.userId;
        const room = await makeRoom(roomId as string, userId);

        res.json({
            roomId: room.id,
            language: room.language,
            code: room.code,
        });
    } catch {
        res.status(500).json({ error: "Failed to load room" });
    }
};

// CREATE ROOM
export const createRoom = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: "Authentication Required" })

        const room = await createRoomService(userId);

        res.json({ roomId: room.id });
    } catch {
        res.status(500).json({ error: "Failed to create room" });
    }
};


// SAVE ROOM CODE
export const saveRoomCode = async (req: AuthRequest, res: Response) => {
    const roomId = req.params.roomId;
    const { code, language } = req.body;

    if (!roomId || typeof roomId !== "string") {
        return res.status(400).json({ error : "Invalid RoomId"});
    }

    try {
        const room = await prisma.room.findUnique({
            where: { id: roomId },
        });

        if (!room) {
            return res.status(404).json({ error: "Room not found"});
        }

        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized"});
        }

        const isOwner = room.userId === userId;
        //const isParticipant = RoomParticipants.get(roomId)?.has(userId);

        const users = await redis.hGetAll(`room:${roomId}:users`);
        const isParticipant = Object.values(users)
            .map(u => {
                try { return JSON.parse(u); } catch { return null; }
            })
            .filter(Boolean)
            .some((u: any) => u.userId === userId);
              
        if (!isOwner && !isParticipant) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await prisma.room.update({
            where: { id: roomId },
            data: {
                code,
                language,
            },
        });

        res.json({ success: true });
    } catch  {
        res.status(500).json({ error: "Failed to save room" });
    }
}; 