-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeSnapshot" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeSnapshot_roomId_idx" ON "CodeSnapshot"("roomId");

-- AddForeignKey
ALTER TABLE "CodeSnapshot" ADD CONSTRAINT "CodeSnapshot_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
