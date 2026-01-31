/*
  Warnings:

  - The values [vision] on the enum `FileProcessingStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FileProcessingStatus_new" AS ENUM ('uploading', 'queued', 'processing', 'starting', 'extracting', 'images', 'chunking', 'completed', 'failed');
ALTER TABLE "Source" ALTER COLUMN "processingStatus" DROP DEFAULT;
ALTER TABLE "Source" ALTER COLUMN "processingStatus" TYPE "FileProcessingStatus_new" USING ("processingStatus"::text::"FileProcessingStatus_new");
ALTER TYPE "FileProcessingStatus" RENAME TO "FileProcessingStatus_old";
ALTER TYPE "FileProcessingStatus_new" RENAME TO "FileProcessingStatus";
DROP TYPE "FileProcessingStatus_old";
ALTER TABLE "Source" ALTER COLUMN "processingStatus" SET DEFAULT 'uploading';
COMMIT;
