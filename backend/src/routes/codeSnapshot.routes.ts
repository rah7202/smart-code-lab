import { Router } from "express";
import { getSnapshotsController, saveSnapshotController } from "../controllers/codeSnapshot.controller";

const router = Router();

router.post("/:roomId", saveSnapshotController);
router.get("/:roomId", getSnapshotsController);

export default router;