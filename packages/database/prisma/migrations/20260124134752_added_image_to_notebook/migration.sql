-- AlterTable
ALTER TABLE "notebook" ADD COLUMN     "image" TEXT,
ADD COLUMN     "sources" INTEGER NOT NULL DEFAULT 0;
