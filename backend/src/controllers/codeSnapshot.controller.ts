import { Request, Response } from "express";
import { prisma } from "../db/prisma";

export const saveSnapshotController = async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { code, language } = req.body;

    try {
        await prisma.codeSnapshot.create({
            data: {
                roomId: roomId as string,
                code: code as string,
                language: language as string,
            },
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save snapshot" });
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch snapshots" });
    }
};