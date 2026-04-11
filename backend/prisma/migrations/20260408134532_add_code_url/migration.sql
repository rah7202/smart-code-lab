/*
  Warnings:

  - You are about to drop the column `code` on the `Room` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Room" DROP COLUMN "code",
ADD COLUMN     "codeUrl" TEXT;
