import express from "express";
import helmet from "helmet";
import cors from "cors";
import hpp from "hpp";
import xss from "xss-clean";

// ======== ROUTES ========
import userRoutes from "./routes/user.routes";
import reelsFeedRoutes from "./routes/reels";
import profileRoutes from "./routes/profile";
import postActionsRouter from "./routes/postActions";
import reelActionsRouter from "./routes/reelActions";
import storiesFeedRoutes from "./routes/stories";
import storyDetailsRoutes from "./routes/storyDetails";
import exploreRoutes from "./routes/getpost";
import uploadRouter from "./routes/upload";
import storyActionsRouter from "./routes/storyActions";
import storySeenRouter from "./routes/storyViews";
import profileOtherRoutes from "./routes/profileOther";

// DM SYSTEM
import chatRoutes from "./routes/chat.routes";
import messageRoutes from "./routes/message.routes";

import errorHandler from "./middleware/errorHandler";

const app = express();

// =========================
// 🚀 GLOBAL ANTI-CACHE FIX
// =========================
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// =========================
// HEALTH CHECK
// =========================
app.get("/env-check", (_req, res) => {
  res.json({
    host: process.env.DB_HOST || null,
    port: process.env.DB_PORT || null,
    user: process.env.DB_USER || null,
    name: process.env.DB_NAME || null,
  });
});

// =========================
// SECURITY
// =========================
app.use(helmet());
app.use(cors());
app.use(hpp());
app.use(xss() as any);
app.use(express.json());

// =========================
// ROUTES
// =========================

// AUTH
app.use("/api/auth", userRoutes);

// PROFILE
app.use("/api/users/profile", profileRoutes);
app.use("/api/profile", profileOtherRoutes);

// POSTS
app.use("/api/posts", postActionsRouter);
app.use("/api/posts", exploreRoutes);

// REELS
app.use("/api/reels", reelsFeedRoutes);
app.use("/api/reels", reelActionsRouter);

// STORIES
app.use("/api/stories", storiesFeedRoutes);
app.use("/api/stories", storyDetailsRoutes);
app.use("/api/stories", storyActionsRouter);
app.use("/api/stories", storySeenRouter);

// UPLOAD
app.use("/api/upload", uploadRouter);

// DM SYSTEM
app.use("/api/chat", chatRoutes);
app.use("/api/messages", messageRoutes);

// ERRORS
app.use(errorHandler);

export default app;
