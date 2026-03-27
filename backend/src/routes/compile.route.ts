import { Router } from "express"
import { compileCode } from "../controllers/compile.controller";

const router = Router();

router.post("/", compileCode);

export default router;