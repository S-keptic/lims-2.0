"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_js_1 = __importDefault(require("./app.js"));
const PORT = 3000;
function startServer() {
    app_js_1.default.listen(PORT, () => {
        console.log(`LIMS API running on port ${PORT}`);
    });
}
startServer();
