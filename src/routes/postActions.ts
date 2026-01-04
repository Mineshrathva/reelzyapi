import { Router, Request, Response } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* ===============================
   LIKE / UNLIKE POST
================================ */
router.post(
  "/:postId/like",
  authenticate,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user!.id;
      const postId = Number(req.params.postId);

      const [exists]: any = await db.query(
        "SELECT 1 FROM post_likes WHERE user_id=? AND post_id=?",
        [userId, postId]
      );

      if (exists.length) {
        await db.query(
          "DELETE FROM post_likes WHERE user_id=? AND post_id=?",
          [userId, postId]
        );

        await db.query(
          "UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id=?",
          [postId]
        );

        return res.json({ liked: false });
      }

      await db.query(
        "INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)",
        [userId, postId]
      );

      await db.query(
        "UPDATE posts SET likes_count = likes_count + 1 WHERE id=?",
        [postId]
      );

      res.json({ liked: true });
    } catch (err) {
      console.error("POST LIKE ERROR:", err);
      res.status(500).json({ error: "Like failed" });
    }
  }
);

/* ===============================
   COMMENT POST
================================ */
router.post(
  "/:postId/comment",
  authenticate,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const { comment } = req.body;
      const userId = req.user!.id;
      const postId = Number(req.params.postId);

      if (!comment || !comment.trim()) {
        return res.status(400).json({ error: "Comment required" });
      }

      await db.query(
        "INSERT INTO post_comments (user_id, post_id, comment) VALUES (?, ?, ?)",
        [userId, postId, comment.trim()]
      );

      await db.query(
        "UPDATE posts SET comments_count = comments_count + 1 WHERE id=?",
        [postId]
      );

      res.json({ message: "Comment added" });
    } catch (err) {
      console.error("POST COMMENT ERROR:", err);
      res.status(500).json({ error: "Comment failed" });
    }
  }
);

/* ===============================
   SHARE POST
================================ */
router.post(
  "/:postId/share",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const postId = Number(req.params.postId);

      await db.query(
        "UPDATE posts SET shares_count = shares_count + 1 WHERE id=?",
        [postId]
      );

      res.json({ shared: true });
    } catch (err) {
      console.error("POST SHARE ERROR:", err);
      res.status(500).json({ error: "Share failed" });
    }
  }
);

/* ===============================
   SAVE / UNSAVE POST
================================ */
router.post(
  "/:postId/save",
  authenticate,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user!.id;
      const postId = Number(req.params.postId);

      const [exists]: any = await db.query(
        "SELECT 1 FROM post_saves WHERE user_id=? AND post_id=?",
        [userId, postId]
      );

      if (exists.length) {
        await db.query(
          "DELETE FROM post_saves WHERE user_id=? AND post_id=?",
          [userId, postId]
        );
        return res.json({ saved: false });
      }

      await db.query(
        "INSERT INTO post_saves (user_id, post_id) VALUES (?, ?)",
        [userId, postId]
      );

      res.json({ saved: true });
    } catch (err) {
      console.error("POST SAVE ERROR:", err);
      res.status(500).json({ error: "Save failed" });
    }
  }
);

export default router;
