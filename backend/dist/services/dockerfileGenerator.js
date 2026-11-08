"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDockerfile = generateDockerfile;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
async function generateDockerfile(workspacePath) {
    const dockerfilePath = path_1.default.join(workspacePath, "Dockerfile");
    // Check whether the repository already has a Dockerfile
    try {
        await promises_1.default.access(dockerfilePath);
        console.log("Existing Dockerfile found.");
        return;
    }
    catch {
        console.log("No Dockerfile found. Generating one...");
    }
    // Check whether this is a Node.js project
    const packagePath = path_1.default.join(workspacePath, "package.json");
    try {
        await promises_1.default.access(packagePath);
    }
    catch {
        throw new Error("No Dockerfile or package.json found. Cannot detect build strategy.");
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
    await promises_1.default.writeFile(dockerfilePath, dockerfile.trimStart(), "utf-8");
    console.log("Dockerfile generated successfully.");
}
