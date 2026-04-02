import { Router } from "express"
import { compileCode } from "../controllers/compile.controller";
import { validate, compileSchema} from "../middleware/validate";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, validate(compileSchema), compileCode);

export default router;