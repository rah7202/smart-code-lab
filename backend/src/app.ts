import express from "express";
import cors from "cors";

import compileRoutes from "./routes/compile.route";
import aiRoutes from "./routes/ai.route";
import snapshotRoutes from "./routes/codeSnapshot.routes";
import roomRoutes from "./routes/room.route";

const app = express();

app.use(cors());
app.use(express.json());

// for sendBeacon
app.use(express.text());

app.use("/compile", compileRoutes);
app.use("/ai", aiRoutes);
app.use("/snapshot", snapshotRoutes);
app.use("/room", roomRoutes);

export default app;