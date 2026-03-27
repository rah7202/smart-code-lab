import { prisma } from "../db/prisma";

export const getOrCreateRoom = async (roomId: string) => {
    let room = await prisma.room.findUnique({
        where: { id: roomId },
    });

    if (!room) {
        room = await prisma.room.create({
            data: {
                id: roomId,
                language: "javascript",
                code: "",
            },
        });
    }

    return room;
};