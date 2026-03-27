/*
  Warnings:

  - Added the required column `language` to the `CodeSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CodeSnapshot" ADD COLUMN     "language" TEXT NOT NULL;
