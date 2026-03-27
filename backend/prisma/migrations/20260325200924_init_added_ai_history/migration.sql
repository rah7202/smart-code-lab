-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIMessage_roomId_idx" ON "AIMessage"("roomId");

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
