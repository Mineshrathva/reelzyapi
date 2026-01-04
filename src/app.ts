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
import exploreRoutes from "./routes/explore"; // ✅ rename to avoid 'router' confusion
import uploadRouter from "./routes/upload";
import storyActionsRouter from "./routes/storyActions";


const app = express();

app.use(helmet());
app.use(cors());
app.use(hpp());
app.use(xss() as any);

app.use(express.json({ limit: "10kb" }));

// Rate Limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

// Routes
app.use("/api/auth", userRoutes);
app.use("/api/reelsfeed", reelsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/posts", postActionsRouter);
app.use("/api/storiesfeed", storiesRoutes);
app.use("/api/explore", exploreRoutes); // ✅ fixed missing slash
app.use("/api/upload", uploadRouter);
app.use("/api/reels", reelActionsRouter);
app.use("/api/stories", storyActionsRouter);


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Global error handler
app.use(errorHandler);

export default app;
