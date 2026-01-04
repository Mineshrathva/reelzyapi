import { Router, Request, Response } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* ===============================
   LIKE / UNLIKE REEL
================================ */
router.post(
  "/:reelId/like",
  authenticate,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user!.id;
      const reelId = Number(req.params.reelId);

      const [exists]: any = await db.query(
        "SELECT 1 FROM reel_likes WHERE user_id=? AND reel_id=?",
        [userId, reelId]
      );

      if (exists.length) {
        await db.query(
          "DELETE FROM reel_likes WHERE user_id=? AND reel_id=?",
          [userId, reelId]
        );

        await db.query(
          "UPDATE reels SET likes_count = GREATEST(likes_count - 1, 0) WHERE id=?",
          [reelId]
        );

        return res.json({ liked: false });
      }

      await db.query(
        "INSERT INTO reel_likes (user_id, reel_id) VALUES (?, ?)",
        [userId, reelId]
      );

      await db.query(
        "UPDATE reels SET likes_count = likes_count + 1 WHERE id=?",
        [reelId]
      );

      res.json({ liked: true });
    } catch (err) {
      console.error("REEL LIKE ERROR:", err);
      res.status(500).json({ error: "Like failed" });
    }
  }
);

/* ===============================
   COMMENT REEL
================================ */
router.post(
  "/:reelId/comment",
  authenticate,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const { comment } = req.body;
      const userId = req.user!.id;
      const reelId = Number(req.params.reelId);

      if (!comment || !comment.trim()) {
        return res.status(400).json({ error: "Comment required" });
      }

      await db.query(
        "INSERT INTO reel_comments (user_id, reel_id, comment) VALUES (?, ?, ?)",
        [userId, reelId, comment.trim()]
      );

      await db.query(
        "UPDATE reels SET comments_count = comments_count + 1 WHERE id=?",
        [reelId]
      );

      res.json({ message: "Comment added" });
    } catch (err) {
      console.error("REEL COMMENT ERROR:", err);
      res.status(500).json({ error: "Comment failed" });
    }
  }
);

/* ===============================
   SHARE REEL
================================ */
router.post(
  "/:reelId/share",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const reelId = Number(req.params.reelId);

      await db.query(
        "UPDATE reels SET shares_count = shares_count + 1 WHERE id=?",
        [reelId]
      );

      res.json({ shared: true });
    } catch (err) {
      console.error("REEL SHARE ERROR:", err);
      res.status(500).json({ error: "Share failed" });
    }
  }
);

/* ===============================
   SAVE / UNSAVE REEL
================================ */
router.post(
  "/:reelId/save",
  authenticate,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user!.id;
      const reelId = Number(req.params.reelId);

      const [exists]: any = await db.query(
        "SELECT 1 FROM reel_saves WHERE user_id=? AND reel_id=?",
        [userId, reelId]
      );

      if (exists.length) {
        await db.query(
          "DELETE FROM reel_saves WHERE user_id=? AND reel_id=?",
          [userId, reelId]
        );
        return res.json({ saved: false });
      }

      await db.query(
        "INSERT INTO reel_saves (user_id, reel_id) VALUES (?, ?)",
        [userId, reelId]
      );

      res.json({ saved: true });
    } catch (err) {
      console.error("REEL SAVE ERROR:", err);
      res.status(500).json({ error: "Save failed" });
    }
  }
);

/* ===============================
   VIEW + WATCH TIME
================================ */
router.post(
  "/:reelId/view",
  authenticate,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user!.id;
      const reelId = Number(req.params.reelId);
      const { watch_time } = req.body; // seconds

      // record view only once per user
      const [exists]: any = await db.query(
        "SELECT 1 FROM reel_views WHERE user_id=? AND reel_id=?",
        [userId, reelId]
      );

      if (!exists.length) {
        await db.query(
          "INSERT INTO reel_views (user_id, reel_id, watch_time) VALUES (?, ?, ?)",
          [userId, reelId, Number(watch_time) || 0]
        );

        await db.query(
          "UPDATE reels SET views_count = views_count + 1 WHERE id=?",
          [reelId]
        );
      } else {
        // update watch time if user watched more
        await db.query(
          "UPDATE reel_views SET watch_time = GREATEST(watch_time, ?) WHERE user_id=? AND reel_id=?",
          [Number(watch_time) || 0, userId, reelId]
        );
      }

      res.json({ viewed: true });
    } catch (err) {
      console.error("REEL VIEW ERROR:", err);
      res.status(500).json({ error: "View failed" });
    }
  }
);

export default router;
