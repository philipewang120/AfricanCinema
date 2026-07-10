import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import passport from "passport";
import compression from "compression";
import pg from "pg";


import "./config/passport.js";

import authRoutes from "./routes/auth.js";
import africanRoutes from "./routes/african.js";
import adminRoutes from "./routes/admin.js";
import profileRoutes from "./routes/profile.js";
import { startPipelineCron } from "./cron/pipelineJob.js";


dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  process.env.CLIENT_URL,

].filter(Boolean);


app.set("trust proxy", 1);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(passport.initialize());
app.use(compression());
app.use(express.static("public"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "african-cinema" });
});

app.use("/", authRoutes);
app.use("/", africanRoutes);
app.use("/admin", adminRoutes);
app.use("/", profileRoutes);

app.listen(port, () => {
  console.log(`African Cinema API running on port ${port}`);
  startPipelineCron();
});
