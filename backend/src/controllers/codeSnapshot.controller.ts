import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { saveCodeSnapshot } from "../services/codeSnapshot.service";
import { getCodeFromGCS, uploadCodeToGCS } from "../lib/storage";
import { logger } from "../utils/logger";

export const saveSnapshotController = async (req: Request, res: Response) => {
    
    try {
        const { roomId } = req.params;
        const { code, language } = req.body;
        const codeUrl = await uploadCodeToGCS(code, roomId as string);
        
        await saveCodeSnapshot(
            roomId as string,
            codeUrl as string,
            language as string,
            code as string,   
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

        const result = await Promise.all(
            
            snapshots.map(async (snap) => {
                try {                
                    const code = await getCodeFromGCS(snap.code);
                    return { ...snap, code}
                } catch (err) {
                    logger.error("Failed to fetch snapshot from GCS : ");
                    return { ...snap, code: "// Failed to load code" };
                }
            })
        );
        res.json(result);
    } catch {
        res.status(500).json({ error: "Failed to fetch snapshots"});
    }
};