-- DropIndex
DROP INDEX "DocumentChunk_embedding_idx";

-- AlterTable
ALTER TABLE "notebook" ADD COLUMN     "context" JSONB;
