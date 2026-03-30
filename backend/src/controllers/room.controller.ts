import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { getOrCreateRoom } from "../services/room.service";

//  GET ROOM DATA
export const getRoomData = async (req: Request, res: Response) => {
    const { roomId } = req.params;

    try {
        const room = await getOrCreateRoom(roomId as string);

        res.json({
            roomId: room.id,
            language: room.language,
            code: room.code,
        });
    } catch {
        res.status(500).json({ error: "Failed to load room" });
    }
};

// SAVE ROOM CODE
export const saveRoomCode = async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { code, language } = req.body;

    try {
        await prisma.room.update({
            where: { id: roomId as string },
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