/*
  Warnings:

  - You are about to drop the column `createdAt` on the `DocumentChunk` table. All the data in the column will be lost.
  - You are about to drop the column `page` on the `DocumentChunk` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `DocumentChunk` table. All the data in the column will be lost.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- AlterTable
ALTER TABLE "DocumentChunk" DROP COLUMN "createdAt",
DROP COLUMN "page",
DROP COLUMN "updatedAt";

-- CreateIndex
CREATE INDEX "content_gin_idx" ON "DocumentChunk" USING GIN ("content" gin_trgm_ops);
