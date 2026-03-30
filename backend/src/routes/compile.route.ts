import { Router } from "express"
import { compileCode } from "../controllers/compile.controller";
import { validate, compileSchema} from "../middleware/validate";


const router = Router();

router.post("/", validate(compileSchema), compileCode);

export default router;