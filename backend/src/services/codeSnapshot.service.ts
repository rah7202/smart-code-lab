import { prisma } from "../db/prisma";

export const saveCodeSnapshot = async (
    roomId: string,
    code: string,
    language: string
)  => {

    const lastSnapshot = await prisma.codeSnapshot.findFirst({
        where: { roomId },
        orderBy: { createdAt: "desc" },
    });

    // If same code, skip saving
    if (lastSnapshot?.code === code && lastSnapshot?.language === language) {
        return;
    }

    return await prisma.codeSnapshot.create({
        data: {
            roomId,
            code,
            language,
        },
    });
};