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
import exploreRoutes from "./routes/getpost";
import uploadRouter from "./routes/upload";
import storyActionsRouter from "./routes/storyActions";
import storyDetailsRoutes from "./routes/storyDetails";
import profileOtherRoutes from "./routes/profileOther";

const app = express();
// HEALTH CHECK (ADD THIS)
app.get("/env-check", (_req, res) => {
  res.json({
    host: process.env.DB_HOST || null,
    port: process.env.DB_PORT || null,
    user: process.env.DB_USER || null,
    name: process.env.DB_NAME || null,
  });
});


app.use(helmet());
app.use(cors());
app.use(hpp());
app.use(xss() as any);
app.use(express.json());

// routes
app.use("/api/auth", userRoutes);
app.use("/api/reels", reelsRoutes);
app.use("/api/users/profile", profileRoutes);
app.use("/api/posts_action", postActionsRouter);
app.use("/api/stories", storiesRoutes);
app.use("/api/stories", storyDetailsRoutes);
app.use("/api/posts", exploreRoutes); // ✅ fixed missing slash
app.use("/api/upload", uploadRouter);
app.use("/api/reels_action", reelActionsRouter);
app.use("/api/stories_action", storyActionsRouter);
app.use("/api/story-details", storyDetailsRoutes);
app.use("/api/users/profile", profileOtherRoutes);

app.use(errorHandler);

export default app;   // 🔥 THIS LINE IS REQUIRED
