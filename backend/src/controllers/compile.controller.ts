import { Request, Response } from "express";
import { submitCode } from "../services/judge0.service";
import { CompileRequest } from "../types";

export const compileCode = async (req: Request, res: Response) => {
    try {
        const { code, userLangId, input } = req.body as CompileRequest;
        const result = await submitCode(code, userLangId, input);

        let output = "";
        if (result.status.description === "Accepted") {
            output = result.stdout;
        } else {
            output = result.stderr || result.compile_output || result.message || "Error occurred";
        }

        res.json({
            output,
            status: result.status,
            time: result.time
        });

    } catch {
        res.status(500).json({
            error: "Compilation Failed"
        });
    }
};