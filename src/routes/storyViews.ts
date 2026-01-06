import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* =====================================
   MARK STORY AS SEEN
===================================== */
router.post("/:storyId/seen", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const storyId = req.params.storyId;

    await db.query(
      `
      INSERT IGNORE INTO story_views (story_id, user_id)
      VALUES (?, ?)
      `,
      [storyId, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("STORY SEEN ERROR:", err);
    res.status(500).json({ error: "Failed to mark story as seen" });
  }
});

export default router;
