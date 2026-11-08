
import { deploymentQueue } from "./queues/deploymentQueue.js";

async function main() {
  const job = await deploymentQueue.add("test-deployment", {
    deploymentId: 1,
    message: "Hello from LIMS",
  });

  console.log("Test job added successfully:", job.id);

  await deploymentQueue.close();
}

main().catch((error) => {
  console.error("Failed to add test job:", error);
  process.exitCode = 1;
});
