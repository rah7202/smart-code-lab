import express from "express";
import * as authController from "../controllers/auth.controller"; 
import { validate, authSchema } from "../middleware/validate";

const router = express.Router();

router.post("/signup", validate(authSchema), authController.signup);
router.post("/signin", validate(authSchema), authController.signin);

export default router;

