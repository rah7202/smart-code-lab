import { Router } from "express";
import { getRoomData, createRoom, saveRoomCode } from "../controllers/room.controller";
import { validate, roomSaveSchema } from "../middleware/validate";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Load room
router.get("/:roomId", authenticate, getRoomData);

// Save current code (debounced)
router.post("/create", authenticate, createRoom );
router.post("/:roomId/save", authenticate, validate(roomSaveSchema), saveRoomCode);


export default router;