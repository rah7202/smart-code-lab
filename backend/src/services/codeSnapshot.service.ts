import { prisma } from "../db/prisma";
import crypto from "crypto"

export const saveCodeSnapshot = async (
    roomId: string,
    codeUrl: string,
    language: string,
    rawCode: string,
)  => {

    const codeHash = crypto
        .createHash("sha256")
        .update(rawCode)
        .digest("hex");
                
    const lastSnapshot = await prisma.codeSnapshot.findFirst({
        where: { roomId },
        orderBy: { createdAt: "desc" },
    });

    // SAFE DEDUP CHECK
    if (lastSnapshot?.codeHash && lastSnapshot.codeHash === codeHash && lastSnapshot.language === language) return;
    

    return await prisma.codeSnapshot.create({
        data: {
            roomId,
            code: codeUrl,
            language,
            codeHash
        },
    });
};