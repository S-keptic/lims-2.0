import express from 'express'
import cors from 'cors';
import authRoutes from "./routes/authRoutes.js"
import { authenticateToken } from './middleware/authMiddleware.js';
import applicationRoutes from "./routes/applicationRoutes.js"
const app = express();


app.use(cors());
app.use(express.json());


app.use("/api/auth",authRoutes);
app.use("/api/applications",applicationRoutes);


app.get("/api/protected", authenticateToken, (_req, res) => {
  res.status(200).json({
    message: "You are authenticated",
  });
});



app.get('/health',(_req,res)=>{
    res.status(200).json({
        status:"heathly",
        seervice : "LIMS API"

    })
})

export default app;