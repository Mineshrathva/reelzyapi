import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import xss from "xss-clean";

import userRoutes from "./routes/user.routes";
import errorHandler from "./middleware/errorHandler";
import reelsRoutes from "./routes/reels_feed";
import profileRoutes from "./routes/profile";
import postActionsRouter from "./routes/postActions";
import reelActionsRouter from "./routes/reelActions";
import storiesRoutes from "./routes/stories";
import exploreRoutes from "./routes/explore";
import uploadRouter from "./routes/upload";
import storyActionsRouter from "./routes/storyActions";

const app = express();
// HEALTH CHECK (ADD THIS)
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use(helmet());
app.use(cors());
app.use(hpp());
app.use(xss() as any);
app.use(express.json());

// routes
app.use("/api/users", userRoutes);
app.use("/api/reels", reelsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/posts", postActionsRouter);
app.use("/api/reels", reelActionsRouter);
app.use("/api/stories", storiesRoutes);
app.use("/api/stories", storyActionsRouter);
app.use("/api/explore", exploreRoutes);
app.use("/api/upload", uploadRouter);

// error handler (LAST)
app.use(errorHandler);

export default app;   // 🔥 THIS LINE IS REQUIRED
