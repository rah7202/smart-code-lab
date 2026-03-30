import { Router } from "express";
import { getSnapshotsController, saveSnapshotController } from "../controllers/codeSnapshot.controller";
import { validate, snapshotSchema } from "../middleware/validate";

const router = Router();

router.post("/:roomId", validate(snapshotSchema), saveSnapshotController);
router.get("/:roomId", getSnapshotsController);

export default router;