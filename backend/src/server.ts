import "dotenv/config";
import app from "./app.js";

const PORT = 3000;

function startServer() {
  app.listen(PORT, () => {
    console.log(`LIMS API running on port ${PORT}`);
  });
}

startServer();