import { Router } from "express";
import { askAI, clearAIHistory, generateResponse, getAIHistory } from "../controllers/ai.controller";

const router = Router();

router.post("/generate", generateResponse);
router.post("/ask", askAI);
router.get("/history/:roomId", getAIHistory);
router.delete("/history/:roomId", clearAIHistory);

export default router;