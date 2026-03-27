import { Router } from "express";
import { getRoomData, saveRoomCode } from "../controllers/room.controller";

const router = Router();

// Load room
router.get("/:roomId", getRoomData);

// Save current code (debounced)
router.post("/:roomId/save", saveRoomCode);

export default router;