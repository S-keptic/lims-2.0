-- AlterTable
ALTER TABLE "Deployment" ADD COLUMN     "containerId" TEXT,
ADD COLUMN     "deploymentUrl" TEXT,
ADD COLUMN     "hostPort" INTEGER;
