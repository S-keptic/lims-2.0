"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_js_1 = require("../generated/prisma/client.js");
const adapter_pg_1 = require("@prisma/adapter-pg");
require("dotenv/config");
const adapter = new adapter_pg_1.PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
const prisma = new client_js_1.PrismaClient({
    adapter,
});
exports.default = prisma;
