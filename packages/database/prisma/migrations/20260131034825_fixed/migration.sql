/*
  Warnings:

  - You are about to drop the `file` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('pdf', 'url');

-- DropForeignKey
ALTER TABLE "file" DROP CONSTRAINT "file_notebookId_fkey";

-- DropForeignKey
ALTER TABLE "file" DROP CONSTRAINT "file_userId_fkey";

-- DropTable
DROP TABLE "file";

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "content" JSONB,
    "processingStatus" "FileProcessingStatus" NOT NULL DEFAULT 'uploading',
    "notebookId" TEXT NOT NULL,
    "type" "FileType" NOT NULL DEFAULT 'pdf',
    "image_paths" TEXT[],

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1024) NOT NULL,
    "sourceId" TEXT NOT NULL,
    "parentIds" TEXT[],

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentChunk" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "ParentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Source_userId_idx" ON "Source"("userId");

-- CreateIndex
CREATE INDEX "Source_notebookId_idx" ON "Source"("notebookId");

-- CreateIndex
CREATE INDEX "DocumentChunk_sourceId_idx" ON "DocumentChunk"("sourceId");

-- CreateIndex
CREATE INDEX "content_gin_idx" ON "DocumentChunk" USING GIN ("content" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "ParentChunk_sourceId_idx" ON "ParentChunk"("sourceId");

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentChunk" ADD CONSTRAINT "ParentChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
