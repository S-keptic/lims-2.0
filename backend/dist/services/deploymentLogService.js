"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDockerLogCollector = startDockerLogCollector;
const child_process_1 = require("child_process");
const prisma_js_1 = __importDefault(require("../config/prisma.js"));
// Keep track of active log collectors
const activeCollectors = new Map();
function startDockerLogCollector(deploymentId, containerId) {
    // Avoid starting duplicate collectors
    if (activeCollectors.has(deploymentId)) {
        console.log(`Log collector already running for deployment ${deploymentId}`);
        return;
    }
    console.log(`Starting log collector for deployment ${deploymentId}`);
    // Read logs continuously from Docker
    const dockerProcess = (0, child_process_1.spawn)("docker", ["logs", "--follow", containerId], { windowsHide: true });
    activeCollectors.set(deploymentId, dockerProcess);
    // Save log messages in PostgreSQL
    const saveLog = async (message, logType) => {
        const trimmedMessage = message.trim();
        if (!trimmedMessage)
            return;
        try {
            await prisma_js_1.default.deploymentLog.create({
                data: {
                    deploymentId,
                    message: trimmedMessage,
                    logType,
                },
            });
        }
        catch (error) {
            console.error("Failed to save deployment log:", error);
        }
    };
    // Process incoming output line by line
    const processOutput = (data, logType) => {
        const lines = data.toString().split(/\r?\n/);
        for (const line of lines) {
            if (line.trim()) {
                void saveLog(line, logType);
            }
        }
    };
    // Normal application output
    dockerProcess.stdout?.on("data", (data) => {
        processOutput(data, "INFO");
    });
    // Application errors
    dockerProcess.stderr?.on("data", (data) => {
        processOutput(data, "ERROR");
    });
    // Handle collector errors
    dockerProcess.on("error", (error) => {
        console.error(`Log collector error for deployment ${deploymentId}:`, error);
    });
    // Clean up when Docker log process exits
    dockerProcess.on("close", (code) => {
        console.log(`Log collector stopped for deployment ${deploymentId}. Exit code: ${code}`);
        activeCollectors.delete(deploymentId);
    });
    return dockerProcess;
}
