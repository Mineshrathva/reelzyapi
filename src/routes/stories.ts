import { Router } from "express";
import{ db }from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* ===============================
   VIEW STORY
================================ */
router.post("/:storyId/view", authenticate, async (req: any, res) => {
  const userId = req.user.id;
  const storyId = req.params.storyId;

  await db.query(
    "INSERT IGNORE INTO story_views (user_id, story_id) VALUES (?, ?)",
    [userId, storyId]
  );

  res.json({ viewed: true });
});

/* ===============================
   GET STORY VIEWERS (OWNER ONLY)
================================ */
router.get("/:storyId/views", authenticate, async (req: any, res) => {
  const storyId = req.params.storyId;
  const userId = req.user.id;

  const [owner]: any = await db.query(
    "SELECT user_id FROM stories WHERE id=?",
    [storyId]
  );

  if (!owner.length || owner[0].user_id !== userId) {
    return res.status(403).json({ error: "Not allowed" });
  }

  const [views]: any = await db.query(
    `SELECT u.id, u.username, u.profile_pic
     FROM story_views sv
     JOIN users u ON u.id = sv.user_id
     WHERE sv.story_id = ?`,
    [storyId]
  );

  res.json(views);
});

export default router;
