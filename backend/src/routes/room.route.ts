import { Router } from "express";
import { getRoomData, saveRoomCode } from "../controllers/room.controller";
import { validate, roomSaveSchema } from "../middleware/validate";

const router = Router();

// Load room
router.get("/:roomId", getRoomData);

// Save current code (debounced)
router.post("/:roomId/save",validate(roomSaveSchema), saveRoomCode);

export default router;