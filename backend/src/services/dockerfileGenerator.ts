
import fs from "fs/promises";
import path from "path";

export async function generateDockerfile(
  workspacePath: string
) {
  const dockerfilePath = path.join(
    workspacePath,
    "Dockerfile"
  );

  // Check whether the repository already has a Dockerfile
  try {
    await fs.access(dockerfilePath);
    console.log("Existing Dockerfile found.");
    return;
  } catch {
    console.log("No Dockerfile found. Generating one...");
  }

  // Check whether this is a Node.js project
  const packagePath = path.join(
    workspacePath,
    "package.json"
  );

  try {
    await fs.access(packagePath);
  } catch {
    throw new Error(
      "No Dockerfile or package.json found. Cannot detect build strategy."
    );
  }

  // Generate a basic Node.js Dockerfile
  const dockerfile = `
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=3001

EXPOSE 3001

CMD ["npm", "start"]
`;

  await fs.writeFile(
    dockerfilePath,
    dockerfile.trimStart(),
    "utf-8"
  );

  console.log("Dockerfile generated successfully.");
}
