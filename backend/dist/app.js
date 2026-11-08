"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const authMiddleware_js_1 = require("./middleware/authMiddleware.js");
const applicationRoutes_js_1 = __importDefault(require("./routes/applicationRoutes.js"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/auth", authRoutes_js_1.default);
app.use("/api/applications", applicationRoutes_js_1.default);
app.get("/api/protected", authMiddleware_js_1.authenticateToken, (_req, res) => {
    res.status(200).json({
        message: "You are authenticated",
    });
});
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: "heathly",
        seervice: "LIMS API"
    });
});
exports.default = app;
