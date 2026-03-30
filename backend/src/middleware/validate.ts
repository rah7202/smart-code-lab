import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";

export function validate<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);          
        if (!result.success) {
            res.status(400).json({
                error: "Validation failed",
                issues: result.error.issues.map((i) => ({
                    field: i.path.join("."), 
                    message: i.message,
                })),
            });
            return;
        }
        req.body = result.data; // replace with parsed + coerced data
        next();
    };
}

//-------------SCHEMA------------------------

export const compileSchema = z.object({
    code: z.string().min(1, "Code cannot be empty").max(50_000, "Code too large"),
    userLangId: z.number().int().positive(),
    input: z.string().max(10_000).optional().default(""),
});

export const aiGenerateSchema = z.object({
    prompt: z.string().min(1, "Prompt cannot be empty").max(20_000, "Prompt too long"),
    roomId: z.string().optional(),
});

export const roomSaveSchema = z.object({
    code: z.string().max(50_000),
    language: z.enum(["javascript", "python", "cpp", "c"]),
});

export const snapshotSchema = z.object({
    code: z.string().max(50_000),
    language: z.enum(["javascript", "python", "cpp", "c"]),
});