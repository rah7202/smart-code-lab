import { Request, Response } from "express";
import { AIRequest } from "../types";
import { generativeAIResponse } from "../services/ai.service";
import { prisma } from "../db/prisma";

export const generateResponse = async (req: Request<{}, {}, AIRequest>, res: Response) => {
    const { prompt, roomId } = req.body;

    try {
        if (!prompt) return res.status(400).json({ error: "Prompt is required" });

        // save user message
        await prisma.aIMessage.create({
            data: {
                roomId,
                role: "user",
                content: prompt,
            },
        });

        const response = await generativeAIResponse(prompt);

        // save ai message
        await prisma.aIMessage.create({
            data: {
                roomId,
                role: "ai",
                content: response,
            },
        });

        res.json({
            success: true,
            data: response,
        });
    } catch {
        
        res.status(500).json({
            success: false,
            error: "Failed to generate response" ,
        });
    }
};


export const getAIHistory = async (req: Request, res: Response) => {

    const { roomId } = req.params;

    try {
        const messages = await prisma.aIMessage.findMany({
            where: { roomId: roomId as string },
            orderBy: { createdAt: "asc" },
        });

        res.json(messages);
    } catch {
        
        res.status(500).json({
            success: false,
            error: "Failed to fetch AI history",
        });
    }
};

export const clearAIHistory = async (req: Request, res: Response) => {
    const { roomId } = req.params;

    try {
        await prisma.aIMessage.deleteMany({
            where: { roomId: roomId as string },
        });

        res.json({ success: true });
    } catch {
        res.status(500).json({ error: "Failed to clear history" });
    }
};