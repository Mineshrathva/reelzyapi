import { Router, Request, Response } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* ===============================
   VIEW STORY (NO SELF VIEW)
================================ */
router.post(
  "/:storyId/view",
  authenticate,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user!.id;
      const storyId = Number(req.params.storyId);

      const [story]: any = await db.query(
        "SELECT user_id FROM stories WHERE id=?",
        [storyId]
      );

      if (!story.length)
        return res.status(404).json({ error: "Story not found" });

      // Ignore self view
      if (story[0].user_id === userId) {
        return res.json({ viewed: false });
      }

      const [exists]: any = await db.query(
        "SELECT 1 FROM story_views WHERE user_id=? AND story_id=?",
        [userId, storyId]
      );

      if (!exists.length) {
        await db.query(
          "INSERT INTO story_views (user_id, story_id) VALUES (?, ?)",
          [userId, storyId]
        );
      }

      res.json({ viewed: true });
    } catch (err) {
      console.error("STORY VIEW ERROR:", err);
      res.status(500).json({ error: "View failed" });
    }
  }
);

/* ===============================
   LIKE / UNLIKE STORY (NO SELF LIKE)
================================ */
router.post(
  "/:storyId/like",
  authenticate,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user!.id;
      const storyId = Number(req.params.storyId);

      const [story]: any = await db.query(
        "SELECT user_id FROM stories WHERE id=?",
        [storyId]
      );

      if (!story.length)
        return res.status(404).json({ error: "Story not found" });

      if (story[0].user_id === userId)
        return res.status(403).json({
          error: "You cannot like your own story",
        });

      const [exists]: any = await db.query(
        "SELECT 1 FROM story_likes WHERE user_id=? AND story_id=?",
        [userId, storyId]
      );

      if (exists.length) {
        await db.query(
          "DELETE FROM story_likes WHERE user_id=? AND story_id=?",
          [userId, storyId]
        );
        return res.json({ liked: false });
      }

      await db.query(
        "INSERT INTO story_likes (user_id, story_id) VALUES (?, ?)",
        [userId, storyId]
      );

      res.json({ liked: true });
    } catch (err) {
      console.error("STORY LIKE ERROR:", err);
      res.status(500).json({ error: "Like failed" });
    }
  }
);

/* ===============================
   REPLY TO STORY (PRIVATE / NO SELF REPLY)
================================ */
router.post(
  "/:storyId/reply",
  authenticate,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user!.id;
      const storyId = Number(req.params.storyId);
      const { message } = req.body;

      if (!message || !message.trim())
        return res.status(400).json({ error: "Message required" });

      const [story]: any = await db.query(
        "SELECT user_id FROM stories WHERE id=?",
        [storyId]
      );

      if (!story.length)
        return res.status(404).json({ error: "Story not found" });

      if (story[0].user_id === userId)
        return res.status(403).json({
          error: "You cannot reply to your own story",
        });

      await db.query(
        "INSERT INTO story_replies (user_id, story_id, message) VALUES (?, ?, ?)",
        [userId, storyId, message.trim()]
      );

      res.json({ replied: true });
    } catch (err) {
      console.error("STORY REPLY ERROR:", err);
      res.status(500).json({ error: "Reply failed" });
    }
  }
);

/* ===============================
   SHARE STORY (ALLOWED FOR ALL)
================================ */
router.post(
  "/:storyId/share",
  authenticate,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user!.id;
      const storyId = Number(req.params.storyId);

      const [exists]: any = await db.query(
        "SELECT 1 FROM story_shares WHERE user_id=? AND story_id=?",
        [userId, storyId]
      );

      if (!exists.length) {
        await db.query(
          "INSERT INTO story_shares (user_id, story_id) VALUES (?, ?)",
          [userId, storyId]
        );
      }

      res.json({ shared: true });
    } catch (err) {
      console.error("STORY SHARE ERROR:", err);
      res.status(500).json({ error: "Share failed" });
    }
  }
);

/* ===============================
   GET STORY VIEWS (OWNER ONLY)
================================ */
router.get(
  "/:storyId/views",
  authenticate,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user!.id;
      const storyId = Number(req.params.storyId);

      const [story]: any = await db.query(
        "SELECT user_id FROM stories WHERE id=?",
        [storyId]
      );

      if (!story.length)
        return res.status(404).json({ error: "Story not found" });

      if (story[0].user_id !== userId)
        return res.status(403).json({ error: "Not authorized" });

      const [views]: any = await db.query(
        `SELECT u.id, u.username, sv.created_at
         FROM story_views sv
         JOIN users u ON u.id = sv.user_id
         WHERE sv.story_id=?
         ORDER BY sv.created_at DESC`,
        [storyId]
      );

      res.json(views);
    } catch (err) {
      console.error("GET STORY VIEWS ERROR:", err);
      res.status(500).json({ error: "Failed to fetch views" });
    }
  }
);

export default router;
