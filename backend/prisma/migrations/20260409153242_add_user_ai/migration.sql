/*
  Warnings:

  - Added the required column `userId` to the `AIMessage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AIMessage" DROP CONSTRAINT "AIMessage_roomId_fkey";

-- DropIndex
DROP INDEX "AIMessage_roomId_idx";

-- AlterTable
ALTER TABLE "AIMessage" ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "roomId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AIMessage_userId_idx" ON "AIMessage"("userId");

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
