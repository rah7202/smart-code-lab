import { Request, Response } from "express";
import * as authService from "../services/auth.service";

export const signup = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        const user = await authService.signup(username, password);

        res.json({ message: "User created", userId: user.id });
    } catch (error) {
        const message = error instanceof Error ? error.message : "An error occured";
        res.status(400).json({ error: message });
    }
};

export const signin = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        const data = await authService.signin(username, password);

        res.json(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : "An error occured";
        res.status(400).json({ error: message });
    }
};