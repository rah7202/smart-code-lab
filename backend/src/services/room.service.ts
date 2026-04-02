import { prisma } from "../db/prisma";

export const makeRoom = async (userId: string) => {
    const room = await prisma.room.create({
        data: {
                userId,
                language: "javascript",
                code: "",
            },
    });

    return room;
};

export const getRoomById = async (roomId: string) => {
    return await prisma.room.findUnique({
        where: { id: roomId },
    });
};