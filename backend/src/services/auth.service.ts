import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma"

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required");

export const signup = async (username: string, password: string) => {

    const alredyExist = await prisma.user.findUnique({
        where: {username},
    });

    if (alredyExist) throw new Error("User already exist");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: {
        username,
        password: hashedPassword,
        },
    });

    return user;
};

export const signin = async (username: string, password: string) => {
    
    const user = await prisma.user.findUnique({
        where: { username },
    });

    if (!user) throw new Error("User not found");

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) throw new Error("Invalid credentials");

    const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    return { token };
};