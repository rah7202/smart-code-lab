import { prisma } from "../db/prisma";

export const getRoomById = async (roomId: string) => {
    return await prisma.room.findUnique({
        where: { id: roomId },
    });
};

export const makeRoom = async (roomId: string, userId?: string) => {
    const existingRoom = await getRoomById(roomId);
    if (existingRoom) {
        return existingRoom;
    }

    const payload: { id: string; language: string; code: string; userId?: string } = {
        id: roomId,
        language: "javascript",
        code: "",
    };

    if (userId) {
        payload.userId = userId;
    }

    const room = await prisma.room.create({
        data: payload,
    });

    return room;
};

export const createRoom = async (userId: string) => {
    const room = await prisma.room.create({
        data: {
            userId,
            language: "javascript",
            code: "",
        },
    });

    return room;
};