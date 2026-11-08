
import { Worker } from "bullmq";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

import redisConnection from "../config/redis.js";
import prisma from "../config/prisma.js";

import { generateDockerfile } from "../services/dockerfileGenerator.js";
import { startDockerLogCollector } from "../services/deploymentLogService.js";

const execFileAsync = promisify(execFile);

const deploymentWorker = new Worker(
  "deployment",
  async (job) => {
    const { deploymentId } = job.data;

    console.log("Processing deployment:", deploymentId);

    let containerName: string | undefined;

    try {
      // 1. Fetch deployment and application details
      const deployment = await prisma.deployment.findUnique({
        where: { id: deploymentId },
        include: { application: true },
      });

      if (!deployment) {
        throw new Error("Deployment not found");
      }

      const { repositoryUrl, branch } = deployment.application;

      // 2. Update status to CLONING
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: "CLONING",
          startedAt: new Date(),
          finishedAt: null,
          commitHash: null,
          containerId: null,
          hostPort: null,
          deploymentUrl: null,
        },
      });

      // 3. Prepare workspace
      const workspacePath = path.resolve(
        process.cwd(),
        "../workspaces",
        `deployment-${deploymentId}`
      );

      await fs.mkdir(path.dirname(workspacePath), {
        recursive: true,
      });

      await fs.rm(workspacePath, {
        recursive: true,
        force: true,
      });

      // 4. Clone repository
      console.log("Cloning repository:", repositoryUrl);

      await execFileAsync(
        "git",
        [
          "clone",
          "--depth",
          "1",
          "--single-branch",
          "--branch",
          branch,
          repositoryUrl,
          workspacePath,
        ],
        { timeout: 120000 }
      );

      console.log("Repository cloned:", workspacePath);

      // 5. Retrieve commit hash
      const { stdout } = await execFileAsync(
        "git",
        ["rev-parse", "HEAD"],
        { cwd: workspacePath }
      );

      const commitHash = stdout.trim();

      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { commitHash },
      });

      console.log("Commit hash:", commitHash);

      // 6. Generate Dockerfile if required
      await generateDockerfile(workspacePath);

      // 7. Update status to BUILDING
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: "BUILDING" },
      });

      console.log("Building Docker image...");

      // 8. Generate unique image name
      const imageName =
        `lims-app-${deployment.applicationId}-deployment-${deploymentId}`;

      // 9. Build Docker image
      await execFileAsync(
        "docker",
        ["build", "-t", imageName, workspacePath],
        {
          timeout: 600000,
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      console.log("Docker image built successfully:", imageName);

      // 10. Update status to STARTING
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: "STARTING" },
      });

      // 11. Generate unique container name
      containerName =
        `lims-app-${deployment.applicationId}-deployment-${deploymentId}`;

      console.log("Starting Docker container:", containerName);

      // 12. Start Docker container
      const { stdout: containerOutput } = await execFileAsync(
        "docker",
        [
          "run",
          "-d",
          "--name",
          containerName,
          "-e",
          "PORT=3001",
          "-p",
          "3001",
          imageName,
        ],
        {
          timeout: 120000,
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const containerId = containerOutput.trim();

      console.log("Container started:", containerId);

      // 13. Retrieve dynamically assigned host port
      const { stdout: portOutput } = await execFileAsync(
        "docker",
        ["port", containerName, "3001/tcp"]
      );

      const portMapping = portOutput.trim().split(/\r?\n/)[0];
      const hostPort = Number(portMapping.split(":").pop());

      if (!Number.isInteger(hostPort) || hostPort <= 0) {
        throw new Error(
          `Could not determine container host port: ${portOutput}`
        );
      }

      const deploymentUrl = `http://localhost:${hostPort}`;

      console.log("Container host port:", hostPort);
      console.log("Deployment URL:", deploymentUrl);

      // 14. Save container details and update status
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          containerId,
          hostPort,
          deploymentUrl,
          status: "HEALTH_CHECK",
        },
      });

      console.log("Container details saved successfully.");
      console.log("Starting application health checks...");

      // 15. Check application health
      let isHealthy = false;

      for (let attempt = 1; attempt <= 12; attempt++) {
        try {
          const response = await fetch(deploymentUrl, {
            signal: AbortSignal.timeout(3000),
          });

          if (response.ok) {
            isHealthy = true;

            console.log(
              `Health check passed on attempt ${attempt}.`
            );

            break;
          }

          console.log(
            `Health check attempt ${attempt}: HTTP ${response.status}`
          );
        } catch {
          console.log(
            `Health check attempt ${attempt}: Application not ready yet.`
          );
        }

        if (attempt < 12) {
          await new Promise((resolve) =>
            setTimeout(resolve, 5000)
          );
        }
      }

      // 16. Fail deployment if application is unhealthy
      if (!isHealthy) {
        throw new Error("Application failed health checks.");
      }

      // 17. Mark deployment as RUNNING
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: "RUNNING",
          finishedAt: new Date(),
        },
      });

      console.log("Deployment is now RUNNING!");

      // 18. Start Docker log collector
      startDockerLogCollector(deploymentId, containerId);

      console.log("Deployment log collector started.");

      // 19. Return deployment details
      return {
        deploymentId,
        workspacePath,
        commitHash,
        imageName,
        containerId,
        containerName,
        hostPort,
        deploymentUrl,
        status: "RUNNING",
      };

    } catch (error) {
      console.error("Deployment failed:", error);

      // 20. Clean up failed container
      if (containerName) {
        try {
          await execFileAsync(
            "docker",
            ["rm", "-f", containerName]
          );

          console.log("Failed deployment container cleaned up.");
        } catch (cleanupError) {
          console.error(
            "Container cleanup failed:",
            cleanupError
          );
        }
      }

      // 21. Mark deployment as FAILED
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          containerId: null,
          hostPort: null,
          deploymentUrl: null,
        },
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
  }
);

// Worker event listeners
deploymentWorker.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

deploymentWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

console.log("LIMS deployment worker is listening for jobs...");
