-- AlterTable
ALTER TABLE "file" ALTER COLUMN "path" DROP NOT NULL;

-- AlterTable
ALTER TABLE "notebook" ADD COLUMN     "encrypted" BOOLEAN NOT NULL DEFAULT false;
