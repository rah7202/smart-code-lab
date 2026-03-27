import { Request, Response } from "express";
import { submitCode, getSubmission } from "../services/judge0.service";
import { CompileRequest } from "../types";

export const compileCode = async (req: Request, res: Response) => {
    try {
        const { code, userLangId, input } = req.body as CompileRequest;
        const result = await submitCode(code, userLangId, input);

        let output = "";

        if (result.status.description === "Accepted") {
            output = result.stdout;
        }

        res.json({
            output,
            status: result.status,
            time: result.time
        });

    } catch (err) {
        res.status(500).json({
            err: "Compilation Failed"
        });
    }
};