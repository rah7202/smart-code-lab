import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { saveCodeSnapshot } from "../services/codeSnapshot.service";

export const saveSnapshotController = async (req: Request, res: Response) => {
    
    try {
        const { roomId } = req.params;
        const { code, language } = req.body;
        
        await saveCodeSnapshot(
            roomId as string,
            code as string,
            language as string
        )

        res.json({ success: true });
    } catch {
        res.status(500).json({ error: "Failed to save snapshot"});
    }
};

export const getSnapshotsController = async (req: Request, res: Response) => {
    const { roomId } = req.params;

    try {
        const snapshots = await prisma.codeSnapshot.findMany({
            where: { roomId: roomId as string },
            orderBy: { createdAt: "desc" },
        });

        res.json(snapshots);
    } catch {
        res.status(500).json({ error: "Failed to fetch snapshots"});
    }
};