"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeployment = createDeployment;
exports.getDeployments = getDeployments;
exports.getDeploymentLogs = getDeploymentLogs;
exports.stopDeployment = stopDeployment;
exports.restartDeployment = restartDeployment;
exports.deleteDeployment = deleteDeployment;
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
const prisma_js_1 = __importDefault(require("../config/prisma.js"));
const deploymentQueue_js_1 = require("../queues/deploymentQueue.js");
const deploymentLogService_js_1 = require("../services/deploymentLogService.js");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
// Helper: validate positive integer IDs
function isValidId(id) {
    return Number.isInteger(id) && id > 0;
}
// Helper: wait between health checks
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// Helper: check whether an application is responding
async function checkApplicationHealth(url) {
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(3000),
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
// Helper: perform health checks with retries
async function waitForHealthyApplication(url) {
    for (let attempt = 1; attempt <= 12; attempt++) {
        const healthy = await checkApplicationHealth(url);
        if (healthy) {
            console.log(`Health check passed on attempt ${attempt}`);
            return true;
        }
        console.log(`Health check attempt ${attempt}: Application not ready`);
        if (attempt < 12) {
            await delay(5000);
        }
    }
    return false;
}
// Helper: verify application ownership
async function getOwnedApplication(applicationId, userId) {
    return prisma_js_1.default.application.findFirst({
        where: {
            id: applicationId,
            ownerId: userId,
        },
    });
}
// Helper: verify deployment belongs to application
async function getApplicationDeployment(deploymentId, applicationId) {
    return prisma_js_1.default.deployment.findFirst({
        where: {
            id: deploymentId,
            applicationId,
        },
    });
}
// =====================================================
// CREATE DEPLOYMENT
// POST /api/applications/:id/deployments
// =====================================================
async function createDeployment(req, res) {
    try {
        const applicationId = Number(req.params.id);
        if (!isValidId(applicationId)) {
            return res.status(400).json({
                message: "Invalid application ID",
            });
        }
        const application = await getOwnedApplication(applicationId, req.userId);
        if (!application) {
            return res.status(404).json({
                message: "Application not found",
            });
        }
        // Create deployment record in PostgreSQL
        const deployment = await prisma_js_1.default.deployment.create({
            data: {
                applicationId: application.id,
                status: "QUEUED",
            },
        });
        // Add deployment job to BullMQ
        await deploymentQueue_js_1.deploymentQueue.add("deploy-application", {
            deploymentId: deployment.id,
            applicationId: application.id,
        });
        return res.status(201).json({
            message: "Deployment queued successfully",
            deployment,
        });
    }
    catch (error) {
        console.error("Creating deployment failed:", error);
        return res.status(500).json({
            message: "Failed to create deployment",
        });
    }
}
// =====================================================
// GET DEPLOYMENTS
// GET /api/applications/:id/deployments
// =====================================================
async function getDeployments(req, res) {
    try {
        const applicationId = Number(req.params.id);
        if (!isValidId(applicationId)) {
            return res.status(400).json({
                message: "Invalid application ID",
            });
        }
        const application = await getOwnedApplication(applicationId, req.userId);
        if (!application) {
            return res.status(404).json({
                message: "Application not found",
            });
        }
        const deployments = await prisma_js_1.default.deployment.findMany({
            where: {
                applicationId: application.id,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return res.status(200).json({
            deployments,
        });
    }
    catch (error) {
        console.error("Fetching deployments failed:", error);
        return res.status(500).json({
            message: "Failed to fetch deployments",
        });
    }
}
// =====================================================
// GET DEPLOYMENT LOGS
// GET /api/applications/:id/deployments/:deploymentId/logs
// =====================================================
async function getDeploymentLogs(req, res) {
    try {
        const applicationId = Number(req.params.id);
        const deploymentId = Number(req.params.deploymentId);
        if (!isValidId(applicationId) || !isValidId(deploymentId)) {
            return res.status(400).json({
                message: "Invalid application or deployment ID",
            });
        }
        const application = await getOwnedApplication(applicationId, req.userId);
        if (!application) {
            return res.status(404).json({
                message: "Application not found",
            });
        }
        const deployment = await getApplicationDeployment(deploymentId, applicationId);
        if (!deployment) {
            return res.status(404).json({
                message: "Deployment not found",
            });
        }
        const requestedLimit = Number(req.query.limit ?? 100);
        const requestedOffset = Number(req.query.offset ?? 0);
        if (!Number.isInteger(requestedLimit) ||
            !Number.isInteger(requestedOffset) ||
            requestedLimit <= 0 ||
            requestedOffset < 0) {
            return res.status(400).json({
                message: "Invalid pagination parameters",
            });
        }
        const limit = Math.min(requestedLimit, 500);
        const offset = requestedOffset;
        const [logs, total] = await Promise.all([
            prisma_js_1.default.deploymentLog.findMany({
                where: {
                    deploymentId,
                },
                orderBy: {
                    createdAt: "asc",
                },
                take: limit,
                skip: offset,
            }),
            prisma_js_1.default.deploymentLog.count({
                where: {
                    deploymentId,
                },
            }),
        ]);
        return res.status(200).json({
            deploymentId,
            logs,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + logs.length < total,
            },
        });
    }
    catch (error) {
        console.error("Fetching deployment logs failed:", error);
        return res.status(500).json({
            message: "Failed to fetch deployment logs",
        });
    }
}
// =====================================================
// STOP DEPLOYMENT
// POST /api/applications/:id/deployments/:deploymentId/stop
// =====================================================
async function stopDeployment(req, res) {
    try {
        const applicationId = Number(req.params.id);
        const deploymentId = Number(req.params.deploymentId);
        if (!isValidId(applicationId) || !isValidId(deploymentId)) {
            return res.status(400).json({
                message: "Invalid application or deployment ID",
            });
        }
        const application = await getOwnedApplication(applicationId, req.userId);
        if (!application) {
            return res.status(404).json({
                message: "Application not found",
            });
        }
        const deployment = await getApplicationDeployment(deploymentId, applicationId);
        if (!deployment) {
            return res.status(404).json({
                message: "Deployment not found",
            });
        }
        if (deployment.status !== "RUNNING" || !deployment.containerId) {
            return res.status(400).json({
                message: "Only running deployments can be stopped",
            });
        }
        // Stop the existing Docker container
        await execFileAsync("docker", ["stop", deployment.containerId], { timeout: 30000 });
        const updatedDeployment = await prisma_js_1.default.deployment.update({
            where: {
                id: deploymentId,
            },
            data: {
                status: "STOPPED",
            },
        });
        return res.status(200).json({
            message: "Deployment stopped successfully",
            deployment: updatedDeployment,
        });
    }
    catch (error) {
        console.error("Stopping deployment failed:", error);
        return res.status(500).json({
            message: "Failed to stop deployment",
        });
    }
}
// =====================================================
// RESTART DEPLOYMENT
// POST /api/applications/:id/deployments/:deploymentId/restart
// =====================================================
async function restartDeployment(req, res) {
    let deploymentId = null;
    let containerId = null;
    try {
        const applicationId = Number(req.params.id);
        deploymentId = Number(req.params.deploymentId);
        if (!isValidId(applicationId) || !isValidId(deploymentId)) {
            return res.status(400).json({
                message: "Invalid application or deployment ID",
            });
        }
        const application = await getOwnedApplication(applicationId, req.userId);
        if (!application) {
            return res.status(404).json({
                message: "Application not found",
            });
        }
        const deployment = await getApplicationDeployment(deploymentId, applicationId);
        if (!deployment) {
            return res.status(404).json({
                message: "Deployment not found",
            });
        }
        if (deployment.status !== "STOPPED" || !deployment.containerId) {
            return res.status(400).json({
                message: "Only stopped deployments can be restarted",
            });
        }
        containerId = deployment.containerId;
        await prisma_js_1.default.deployment.update({
            where: { id: deploymentId },
            data: { status: "STARTING" },
        });
        // Start the existing container
        await execFileAsync("docker", ["start", containerId], { timeout: 30000 });
        // IMPORTANT: Ask Docker for the actual host port
        const { stdout } = await execFileAsync("docker", ["port", containerId, "3001/tcp"], { timeout: 10000 });
        const portMapping = stdout.trim().split(/\r?\n/)[0];
        const portMatch = portMapping.match(/:(\d+)$/);
        if (!portMatch) {
            throw new Error(`Could not determine Docker host port: ${stdout}`);
        }
        const hostPort = Number(portMatch[1]);
        const deploymentUrl = `http://localhost:${hostPort}`;
        console.log("Actual Docker host port:", hostPort);
        console.log("Updated deployment URL:", deploymentUrl);
        // Save the actual port before health checking
        await prisma_js_1.default.deployment.update({
            where: { id: deploymentId },
            data: {
                hostPort,
                deploymentUrl,
                status: "HEALTH_CHECK",
            },
        });
        // Check the application using the actual Docker port
        const isHealthy = await waitForHealthyApplication(deploymentUrl);
        if (!isHealthy) {
            throw new Error("Application failed health checks after restart");
        }
        const updatedDeployment = await prisma_js_1.default.deployment.update({
            where: { id: deploymentId },
            data: {
                status: "RUNNING",
            },
        });
        // Resume runtime log collection
        (0, deploymentLogService_js_1.startDockerLogCollector)(deploymentId, containerId);
        return res.status(200).json({
            message: "Deployment restarted successfully",
            deployment: updatedDeployment,
        });
    }
    catch (error) {
        console.error("Restarting deployment failed:", error);
        // Stop the container if the restart did not succeed
        if (containerId) {
            try {
                await execFileAsync("docker", ["stop", containerId], { timeout: 30000 });
            }
            catch (stopError) {
                console.error("Container cleanup failed:", stopError);
            }
        }
        if (deploymentId && isValidId(deploymentId)) {
            try {
                await prisma_js_1.default.deployment.update({
                    where: { id: deploymentId },
                    data: { status: "STOPPED" },
                });
            }
            catch (dbError) {
                console.error("Failed to restore deployment status:", dbError);
            }
        }
        return res.status(500).json({
            message: "Failed to restart deployment",
        });
    }
}
// =====================================================
// DELETE DEPLOYMENT
// DELETE /api/applications/:id/deployments/:deploymentId
// =====================================================
async function deleteDeployment(req, res) {
    try {
        const applicationId = Number(req.params.id);
        const deploymentId = Number(req.params.deploymentId);
        if (!isValidId(applicationId) || !isValidId(deploymentId)) {
            return res.status(400).json({
                message: "Invalid application or deployment ID",
            });
        }
        const application = await getOwnedApplication(applicationId, req.userId);
        if (!application) {
            return res.status(404).json({
                message: "Application not found",
            });
        }
        const deployment = await getApplicationDeployment(deploymentId, applicationId);
        if (!deployment) {
            return res.status(404).json({
                message: "Deployment not found",
            });
        }
        // Remove the Docker container if one exists.
        // docker rm -f also stops a running container.
        if (deployment.containerId) {
            try {
                await execFileAsync("docker", ["rm", "-f", deployment.containerId], { timeout: 30000 });
                console.log("Docker container removed:", deployment.containerId);
            }
            catch (error) {
                console.error("Container cleanup failed:", error);
            }
        }
        // Remove the image created for this deployment
        const imageName = `lims-app-${applicationId}-deployment-${deploymentId}`;
        try {
            await execFileAsync("docker", ["rmi", "-f", imageName], { timeout: 30000 });
            console.log("Docker image removed:", imageName);
        }
        catch (error) {
            console.error("Image cleanup failed:", error);
        }
        // Remove the cloned source workspace
        const workspacePath = path_1.default.resolve(process.cwd(), "../workspaces", `deployment-${deploymentId}`);
        try {
            await (0, promises_1.rm)(workspacePath, {
                recursive: true,
                force: true,
            });
            console.log("Workspace removed:", workspacePath);
        }
        catch (error) {
            console.error("Workspace cleanup failed:", error);
        }
        // Delete the database record.
        // DeploymentLog records are deleted through the
        // onDelete: Cascade relation in the Prisma schema.
        await prisma_js_1.default.deployment.delete({
            where: {
                id: deploymentId,
            },
        });
        return res.status(200).json({
            message: "Deployment and associated resources deleted successfully",
            deletedDeploymentId: deploymentId,
        });
    }
    catch (error) {
        console.error("Deleting deployment failed:", error);
        return res.status(500).json({
            message: "Failed to delete deployment",
        });
    }
}
