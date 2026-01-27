-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('pdf', 'url');

-- AlterTable
ALTER TABLE "file" ADD COLUMN     "type" "FileType" NOT NULL DEFAULT 'pdf';
