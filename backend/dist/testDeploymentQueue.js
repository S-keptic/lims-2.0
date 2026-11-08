"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deploymentQueue_js_1 = require("./queues/deploymentQueue.js");
async function main() {
    const job = await deploymentQueue_js_1.deploymentQueue.add("test-deployment", {
        deploymentId: 1,
        message: "Hello from LIMS",
    });
    console.log("Test job added successfully:", job.id);
    await deploymentQueue_js_1.deploymentQueue.close();
}
main().catch((error) => {
    console.error("Failed to add test job:", error);
    process.exitCode = 1;
});
