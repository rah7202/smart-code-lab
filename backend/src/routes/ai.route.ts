import { Router } from "express";
import { clearAIHistory, generateResponse, getAIHistory } from "../controllers/ai.controller";
import { validate, aiGenerateSchema } from "../middleware/validate";

const router = Router();

router.post("/generate", validate(aiGenerateSchema), generateResponse);
router.get("/history/:roomId", getAIHistory);
router.delete("/history/:roomId", clearAIHistory);

export default router; 