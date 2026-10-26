/*
  Warnings:

  - You are about to drop the column `reference` on the `PayoutRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."PayoutRequest" DROP COLUMN "reference";
