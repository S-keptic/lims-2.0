/*
  Warnings:

  - You are about to drop the column `repositoryURL` on the `Application` table. All the data in the column will be lost.
  - Added the required column `repositoryUrl` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Application" DROP COLUMN "repositoryURL",
ADD COLUMN     "repositoryUrl" TEXT NOT NULL;
