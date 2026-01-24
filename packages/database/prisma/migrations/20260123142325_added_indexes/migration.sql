/*
  Warnings:

  - Added the required column `notebookId` to the `file` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "file" ADD COLUMN     "notebookId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "file_userId_idx" ON "file"("userId");

-- CreateIndex
CREATE INDEX "file_notebookId_idx" ON "file"("notebookId");

-- CreateIndex
CREATE INDEX "notebook_userId_idx" ON "notebook"("userId");

-- AddForeignKey
ALTER TABLE "file" ADD CONSTRAINT "file_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
