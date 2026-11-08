"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const applicationController_js_1 = require("../controllers/applicationController.js");
const deploymentController_js_1 = require("../controllers/deploymentController.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const router = (0, express_1.Router)();
// =====================================================
// APPLICATION ROUTES
// =====================================================
router.post("/", authMiddleware_js_1.authenticateToken, applicationController_js_1.createApplication);
router.get("/", authMiddleware_js_1.authenticateToken, applicationController_js_1.getApplications);
router.get("/:id", authMiddleware_js_1.authenticateToken, applicationController_js_1.getApplicationById);
router.patch("/:id", authMiddleware_js_1.authenticateToken, applicationController_js_1.updateApplication);
router.delete("/:id", authMiddleware_js_1.authenticateToken, applicationController_js_1.deleteApplication);
// =====================================================
// DEPLOYMENT ROUTES
// =====================================================
// Create a deployment
router.post("/:id/deployments", authMiddleware_js_1.authenticateToken, deploymentController_js_1.createDeployment);
// Get all deployments for an application
router.get("/:id/deployments", authMiddleware_js_1.authenticateToken, deploymentController_js_1.getDeployments);
// Get deployment logs
router.get("/:id/deployments/:deploymentId/logs", authMiddleware_js_1.authenticateToken, deploymentController_js_1.getDeploymentLogs);
// Stop a running deployment
router.post("/:id/deployments/:deploymentId/stop", authMiddleware_js_1.authenticateToken, deploymentController_js_1.stopDeployment);
// Restart a stopped deployment
router.post("/:id/deployments/:deploymentId/restart", authMiddleware_js_1.authenticateToken, deploymentController_js_1.restartDeployment);
// Delete a deployment and its associated resources
router.delete("/:id/deployments/:deploymentId", authMiddleware_js_1.authenticateToken, deploymentController_js_1.deleteDeployment);
exports.default = router;
