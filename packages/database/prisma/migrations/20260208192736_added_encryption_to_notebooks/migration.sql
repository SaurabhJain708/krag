/*
  Warnings:

  - You are about to drop the column `encrypted` on the `notebook` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "notebook" DROP COLUMN "encrypted",
ADD COLUMN     "encryption" "Encryption" NOT NULL DEFAULT 'NotEncrypted';
