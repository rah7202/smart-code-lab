import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required");

export interface AuthRequest extends Request {
    user?: {
      userId: string;
      username: string;
    };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    (req as AuthRequest).user = decoded;
    next();
  } catch {
      res.status(401).json({ error: "Invalid token" });
    }
};