import express from "express";
import helmet from "helmet";
import cors from "cors";
import hpp from "hpp";
import xss from "xss-clean";

// ======== ROUTES ========
import userRoutes from "./routes/user.routes";
import reelsFeedRoutes from "./routes/reels_feed";
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

// DM SYSTEM (newly added)
import chatRoutes from "./routes/chat.routes";
import messageRoutes from "./routes/message.routes";

import errorHandler from "./middleware/errorHandler";

const app = express();

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
// SECURITY MIDDLEWARES
// =========================
app.use(helmet());
app.use(cors());
app.use(hpp());
app.use(xss() as any);
app.use(express.json());

// =========================
// API ROUTES (CLEAN ORDER)
// =========================

// AUTH
app.use("/api/auth", userRoutes);

// PROFILE
app.use("/api/users/profile", profileRoutes);       // self profile
app.use("/api/profile", profileOtherRoutes);        // other user profile

// POSTS
app.use("/api/posts", postActionsRouter);
app.use("/api/posts", exploreRoutes);               // explore feed

// REELS
app.use("/api/reels", reelsFeedRoutes);
app.use("/api/reels", reelActionsRouter);

// STORIES (merged cleanly)
app.use("/api/stories", storiesFeedRoutes);         // stories listing
app.use("/api/stories", storyDetailsRoutes);        // user story slides
app.use("/api/stories", storyActionsRouter);        // story actions (delete etc.)
app.use("/api/stories", storySeenRouter);           // seen/mark view

// UPLOAD
app.use("/api/upload", uploadRouter);

// DM SYSTEM
app.use("/api/chat", chatRoutes);
app.use("/api/messages", messageRoutes);

// ERROR HANDLER
app.use(errorHandler);

export default app;
