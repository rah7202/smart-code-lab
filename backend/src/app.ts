
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import compileRoutes from "./routes/compile.route";
import aiRoutes from "./routes/ai.route";
import snapshotRoutes from "./routes/codeSnapshot.routes";
import roomRoutes from "./routes/room.route";

const app = express();

//------SECURITY--MIDDLEWARE-------------------------------
app.use(helmet());

//-------CORS--restrict--to--your--frontend--origin---------
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

app.use(
    cors({
        origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
            // Allow requests with no origin (curl, Postman , server-to-server)
            if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
            cb(new Error(`CORS: origin ${origin} not allowed`));
        },
        credentials:true,
   })
);

//--------BODY--PARSER--------------------------------------
app.use(express.json({ limit: "50kb"}));
app.use(express.text());                 

//----------GLOBAL--RATE--LIMITING---------------------------
const globalRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please slow down." },
});
app.use(globalRateLimiter);

//------AI--specific--tighter--rate--limit-------------------
export const aiLimiter = rateLimit({
    windowMs: 60_000,
    max: 10, // 10 AI requests per IP per minute server-side
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "AI rate limit reached. Try again in a minute." },
});

//------------------ROUTES-----------------------------------
app.use("/compile", compileRoutes);
app.use("/ai", aiRoutes);
app.use("/snapshot", snapshotRoutes);
app.use("/room", roomRoutes);

//----HEALTH--CHECK----------------------------------------
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

//------GLOBAL--ERROR--HANDLER-------------------------------
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[ERROR]", err.message);
    res.status(err.status ?? 500).json({ error:err.message ?? "Internal Server Error" });
});

export default app;