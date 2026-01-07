import { Router, Request, Response } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* ====================================================
   LIKE / UNLIKE — DELETE & ADD SYSTEM
==================================================== */
router.post("/:reelId/like", authenticate, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const reelId = Number(req.params.reelId);

    const [[exists]]: any = await db.query(
      "SELECT 1 FROM reel_likes WHERE user_id=? AND reel_id=?",
      [userId, reelId]
    );

    if (exists) {
      await db.query("DELETE FROM reel_likes WHERE user_id=? AND reel_id=?", [
        userId,
        reelId,
      ]);

      await db.query(
        "UPDATE reels SET likes_count = GREATEST(likes_count - 1, 0) WHERE id=?",
        [reelId]
      );

      return res.json({ liked: false });
    }

    await db.query("INSERT INTO reel_likes (user_id, reel_id) VALUES (?, ?)", [
      userId,
      reelId,
    ]);

    await db.query("UPDATE reels SET likes_count = likes_count + 1 WHERE id=?", [
      reelId,
    ]);

    res.json({ liked: true });
  } catch (err) {
    console.error("LIKE ERROR:", err);
    res.status(500).json({ error: "Like failed" });
  }
});

/* ====================================================
   COMMENT — ALWAYS ADD ONLY
==================================================== */
router.post(
  "/:reelId/comment",
  authenticate,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const reelId = Number(req.params.reelId);
      const { comment } = req.body;

      if (!comment || !comment.trim()) {
        return res.status(400).json({ error: "Comment is required" });
      }

      await db.query(
        "INSERT INTO reel_comments (user_id, reel_id, comment) VALUES (?, ?, ?)",
        [userId, reelId, comment.trim()]
      );

      await db.query(
        "UPDATE reels SET comments_count = comments_count + 1 WHERE id=?",
        [reelId]
      );

      res.json({ commented: true });
    } catch (err) {
      console.error("COMMENT ERROR:", err);
      res.status(500).json({ error: "Comment failed" });
    }
  }
);

/* ====================================================
   SHARE — ALWAYS ADD ONLY
==================================================== */
router.post("/:reelId/share", authenticate, async (req: any, res: Response) => {
  try {
    const reelId = Number(req.params.reelId);

    await db.query(
      "UPDATE reels SET shares_count = shares_count + 1 WHERE id=?",
      [reelId]
    );

    res.json({ shared: true });
  } catch (err) {
    console.error("SHARE ERROR:", err);
    res.status(500).json({ error: "Share failed" });
  }
});

/* ====================================================
   SAVE / UNSAVE — DELETE & ADD SYSTEM
==================================================== */
router.post("/:reelId/save", authenticate, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const reelId = Number(req.params.reelId);

    const [[exists]]: any = await db.query(
      "SELECT 1 FROM reel_saves WHERE user_id=? AND reel_id=?",
      [userId, reelId]
    );

    if (exists) {
      await db.query("DELETE FROM reel_saves WHERE user_id=? AND reel_id=?", [
        userId,
        reelId,
      ]);
      return res.json({ saved: false });
    }

    await db.query(
      "INSERT INTO reel_saves (user_id, reel_id) VALUES (?, ?)",
      [userId, reelId]
    );

    res.json({ saved: true });
  } catch (err) {
    console.error("SAVE ERROR:", err);
    res.status(500).json({ error: "Save failed" });
  }
});

/* ====================================================
   VIEW + WATCH TIME — ADD ONCE + UPDATE
==================================================== */
router.post("/:reelId/view", authenticate, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const reelId = Number(req.params.reelId);
    const { watch_time } = req.body;

    const seconds = Number(watch_time) || 0;

    const [[exists]]: any = await db.query(
      "SELECT 1 FROM reel_views WHERE user_id=? AND reel_id=?",
      [userId, reelId]
    );

    if (!exists) {
      await db.query(
        "INSERT INTO reel_views (user_id, reel_id, watch_time) VALUES (?, ?, ?)",
        [userId, reelId, seconds]
      );

      await db.query(
        "UPDATE reels SET views_count = views_count + 1 WHERE id=?",
        [reelId]
      );

      return res.json({ viewed: true });
    }

    // update only if watch time increased
    await db.query(
      "UPDATE reel_views SET watch_time = GREATEST(watch_time, ?) WHERE user_id=? AND reel_id=?",
      [seconds, userId, reelId]
    );

    res.json({ viewed: true });
  } catch (err) {
    console.error("VIEW ERROR:", err);
    res.status(500).json({ error: "View failed" });
  }
});

export default router;
