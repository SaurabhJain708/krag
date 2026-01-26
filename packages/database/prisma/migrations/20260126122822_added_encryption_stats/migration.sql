/*
  Warnings:

  - The values [pending] on the enum `FileProcessingStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "Encryption" AS ENUM ('NotEncrypted', 'SimpleEncryption', 'AdvancedEncryption');

-- AlterEnum
BEGIN;
CREATE TYPE "FileProcessingStatus_new" AS ENUM ('uploading', 'queued', 'processing', 'starting', 'vision', 'extracting', 'images', 'chunking', 'completed', 'failed');
ALTER TABLE "public"."file" ALTER COLUMN "processingStatus" DROP DEFAULT;
ALTER TABLE "file" ALTER COLUMN "processingStatus" TYPE "FileProcessingStatus_new" USING ("processingStatus"::text::"FileProcessingStatus_new");
ALTER TYPE "FileProcessingStatus" RENAME TO "FileProcessingStatus_old";
ALTER TYPE "FileProcessingStatus_new" RENAME TO "FileProcessingStatus";
DROP TYPE "public"."FileProcessingStatus_old";
ALTER TABLE "file" ALTER COLUMN "processingStatus" SET DEFAULT 'uploading';
COMMIT;

-- AlterTable
ALTER TABLE "file" ALTER COLUMN "processingStatus" SET DEFAULT 'uploading';
