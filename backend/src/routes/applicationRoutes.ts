
import { Router } from "express";

import {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
} from "../controllers/applicationController.js";

import {
  createDeployment,
  getDeployments,
  getDeploymentLogs,
  stopDeployment,
  restartDeployment,
  deleteDeployment,
} from "../controllers/deploymentController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";

const router = Router();

// =====================================================
// APPLICATION ROUTES
// =====================================================

router.post("/", authenticateToken, createApplication);

router.get("/", authenticateToken, getApplications);

router.get("/:id", authenticateToken, getApplicationById);

router.patch("/:id", authenticateToken, updateApplication);

router.delete("/:id", authenticateToken, deleteApplication);

// =====================================================
// DEPLOYMENT ROUTES
// =====================================================

// Create a deployment
router.post(
  "/:id/deployments",
  authenticateToken,
  createDeployment
);

// Get all deployments for an application
router.get(
  "/:id/deployments",
  authenticateToken,
  getDeployments
);

// Get deployment logs
router.get(
  "/:id/deployments/:deploymentId/logs",
  authenticateToken,
  getDeploymentLogs
);

// Stop a running deployment
router.post(
  "/:id/deployments/:deploymentId/stop",
  authenticateToken,
  stopDeployment
);

// Restart a stopped deployment
router.post(
  "/:id/deployments/:deploymentId/restart",
  authenticateToken,
  restartDeployment
);

// Delete a deployment and its associated resources
router.delete(
  "/:id/deployments/:deploymentId",
  authenticateToken,
  deleteDeployment
);

export default router;
