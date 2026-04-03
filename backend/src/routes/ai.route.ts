import { Router } from "express";
import { clearAIHistory, generateResponse, getAIHistory, streamAiResponse } from "../controllers/ai.controller";
import { validate, aiGenerateSchema } from "../middleware/validate";
import { authenticate } from "../middleware/auth.middleware"

const router = Router();

router.post("/generate", authenticate, validate(aiGenerateSchema), generateResponse);
router.post("/stream", authenticate, validate(aiGenerateSchema), streamAiResponse);
router.get("/history/:roomId", authenticate, getAIHistory);
router.delete("/history/:roomId", authenticate, clearAIHistory);

export default router; 