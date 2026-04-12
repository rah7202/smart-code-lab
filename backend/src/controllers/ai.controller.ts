import { Request, Response } from "express";
import { AIRequest } from "../types";
import { streamAIResponse } from "../services/ai.service";
import { prisma } from "../db/prisma";
import { logger } from "../utils/logger";

export const streamAiResponse = async (req: Request<{}, {}, AIRequest>, res: Response) => {
    
    const { prompt, roomId } = req.body;
    const userId = (req as any).user?.userId;

    if (!prompt) {
        return res.status(400).json({ error: "Prompt required" });
    }

    // SSE headers
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    });

    const interval = setInterval(() => {
        res.write(":\n\n");
    }, 15000);
    
    req.on("close", () => { clearInterval(interval)});

    try {
        if (!userId) {
            res.write(`data: ${JSON.stringify({ error: "Unauthorized" })}\n\n`);
            clearInterval(interval);
            return res.end();
        }

        await prisma.aIMessage.create({ data: { userId, roomId, role: "user", content: prompt } });

        let fullResponse = "";
            
        for await (const chunk of streamAIResponse(prompt)) {
            fullResponse +=chunk;
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        clearInterval(interval);
        res.end();

        await prisma.aIMessage.create({ data: { userId, roomId, role: "ai", content: fullResponse } });
    } catch (error) {
        clearInterval(interval);
        
        logger.error("AI Error:", { error: error instanceof Error ? error.message : String(error) });
        res.write(`data: ${JSON.stringify({ error: "AI generation failed" })}\n\n`);
        res.end();
    }
};

export const getAIHistory = async (req: Request, res: Response) => {

    const userId = (req as any).user?.userId;
    try {
        const messages = await prisma.aIMessage.findMany({
            where: { userId: userId as string },
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
    
    const userId = (req as any).user?.userId;
    try {
        await prisma.aIMessage.deleteMany({
            where: { userId: userId as string },
        });

        res.json({ success: true });
    } catch {
        res.status(500).json({ error: "Failed to clear history" });
    }
};