import { Router } from "express";
import { getSnapshotsController, saveSnapshotController } from "../controllers/codeSnapshot.controller";
import { validate, snapshotSchema } from "../middleware/validate";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/:roomId", authenticate, validate(snapshotSchema), saveSnapshotController);
router.get("/:roomId", authenticate, getSnapshotsController);

export default router;