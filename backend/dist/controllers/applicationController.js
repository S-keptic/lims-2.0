"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApplication = createApplication;
exports.getApplications = getApplications;
exports.getApplicationById = getApplicationById;
exports.updateApplication = updateApplication;
exports.deleteApplication = deleteApplication;
const prisma_js_1 = __importDefault(require("../config/prisma.js"));
async function createApplication(req, res) {
    try {
        const { name, repositoryUrl, branch } = req.body;
        if (!name || !repositoryUrl) {
            return res.status(400).json({
                message: "Application name and repository URL are required",
            });
        }
        const application = await prisma_js_1.default.application.create({
            data: {
                name,
                repositoryUrl,
                branch: branch || "main",
                ownerId: req.userId,
            },
        });
        return res.status(201).json({
            message: "Application created successfully",
            application,
        });
    }
    catch (error) {
        console.error("Application creation failed:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
async function getApplications(req, res) {
    try {
        const applications = await prisma_js_1.default.application.findMany({
            where: {
                ownerId: req.userId
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        return res.status(200).json({
            applications,
        });
    }
    catch (error) {
        console.log("Failed to fetch applications", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}
async function getApplicationById(req, res) {
    try {
        const applicationId = Number(req.params.id);
        if (Number.isNaN(applicationId)) {
            return res.status(400).json({
                message: "Invalid application ID",
            });
        }
        const application = await prisma_js_1.default.application.findFirst({
            where: {
                id: applicationId,
                ownerId: req.userId,
            },
        });
        if (!application) {
            return res.status(404).json({
                message: "Application not found",
            });
        }
        return res.status(200).json({
            application,
        });
    }
    catch (error) {
        console.error("Failed to fetch application:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
async function updateApplication(req, res) {
    try {
        const applicationId = Number(req.params.id);
        if (!Number.isInteger(applicationId || applicationId <= 0)) {
            return res.status(400).json({
                message: "Invalid application ID"
            });
        }
        const { name, repositoryUrl, branch } = req.body;
        if (name === undefined && repositoryUrl === undefined
            && branch === undefined) {
            return res.status(400).json({
                message: "Provide at least one field to update"
            });
        }
        const existingApplication = await prisma_js_1.default.application.findFirst({
            where: {
                id: applicationId,
                ownerId: req.userId,
            },
        });
        if (!existingApplication) {
            return res.status(404).json({
                message: "Application not found",
            });
        }
        const application = await prisma_js_1.default.application.update({
            where: {
                id: applicationId,
            },
            data: {
                ...(name !== undefined && { name }),
                ...(repositoryUrl !== undefined && { repositoryUrl }),
                ...(branch !== undefined && { branch }),
            },
        });
        return res.status(200).json({
            message: "Application updated successfully",
            application,
        });
    }
    catch (error) {
        console.error("Application update failed:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
async function deleteApplication(req, res) {
    try {
        const applicationId = Number(req.params.id);
        if (!Number.isInteger(applicationId) || applicationId <= 0) {
            return res.status(400).json({
                message: "Invalid application ID",
            });
        }
        const existingApplication = await prisma_js_1.default.application.findFirst({
            where: {
                id: applicationId,
                ownerId: req.userId,
            },
        });
        if (!existingApplication) {
            return res.status(404).json({
                message: "Application not found",
            });
        }
        await prisma_js_1.default.application.delete({
            where: {
                id: applicationId,
            },
        });
        return res.status(200).json({
            message: "Application deleted successfully",
        });
    }
    catch (error) {
        console.error("Application deletion failed:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
