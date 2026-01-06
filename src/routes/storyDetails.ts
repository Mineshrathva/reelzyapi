import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* =====================================
   GET ALL STORIES OF ONE USER
===================================== */
router.get("/user/:userId", authenticate, async (req: any, res) => {
  try {
    const viewerId = req.user.id;
    const storyUserId = req.params.userId;

    const [stories]: any = await db.query(
      `
      SELECT
        s.id AS story_id,
        s.media_url,
        s.created_at,

        CASE
          WHEN sv.story_id IS NULL THEN 0
          ELSE 1
        END AS is_seen

      FROM stories s
      LEFT JOIN story_views sv
        ON sv.story_id = s.id
        AND sv.user_id = ?

      WHERE
        s.user_id = ?
        AND s.expires_at > NOW()

      ORDER BY s.created_at ASC
      `,
      [viewerId, storyUserId]
    );

    res.json(stories);
  } catch (err) {
    console.error("GET STORY DETAILS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch user stories" });
  }
});

export default router;
