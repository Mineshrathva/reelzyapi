import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* =====================================
   GET STORIES FOR HOME (ME + OTHERS)
===================================== */
router.get("/", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    /* ========= 1️⃣ GET MY STORY ========= */
    const [myStory]: any = await db.query(
      `
      SELECT
        u.id AS user_id,
        u.username,
        u.profile_pic,
        MAX(s.created_at) AS latest_story_time,
        (
          SELECT s2.media_url
          FROM stories s2
          WHERE s2.user_id = u.id
            AND s2.expires_at > NOW()
          ORDER BY s2.created_at DESC
          LIMIT 1
        ) AS story_url,
        SUM(
          CASE 
            WHEN sv.story_id IS NULL THEN 1 
            ELSE 0 
          END
        ) AS unseen_count
      FROM stories s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN story_views sv
        ON sv.story_id = s.id
        AND sv.user_id = ?
      WHERE s.expires_at > NOW()
        AND u.id = ?
      GROUP BY u.id
      `,
      [userId, userId]
    );

    /* ========= 2️⃣ GET FOLLOWING STORIES (EXCLUDE SELF) ========= */
    const [others]: any = await db.query(
      `
      SELECT
        u.id AS user_id,
        u.username,
        u.profile_pic,
        MAX(s.created_at) AS latest_story_time,
        (
          SELECT s2.media_url
          FROM stories s2
          WHERE s2.user_id = u.id
            AND s2.expires_at > NOW()
          ORDER BY s2.created_at DESC
          LIMIT 1
        ) AS story_url,
        SUM(
          CASE 
            WHEN sv.story_id IS NULL THEN 1 
            ELSE 0 
          END
        ) AS unseen_count
      FROM stories s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN story_views sv
        ON sv.story_id = s.id
        AND sv.user_id = ?
      WHERE s.expires_at > NOW()
        AND u.id IN (
          SELECT following_id FROM follows WHERE follower_id = ?
        )
      GROUP BY u.id
      ORDER BY unseen_count DESC, latest_story_time DESC
      `,
      [userId, userId]
    );

    res.json({
      me: myStory.length
        ? {
            ...myStory[0],
            is_me: true,
            has_unseen: myStory[0].unseen_count > 0,
          }
        : null,
      others: others.map((r: any) => ({
        ...r,
        is_me: false,
        has_unseen: r.unseen_count > 0,
      })),
    });
  } catch (err) {
    console.error("GET STORIES ERROR:", err);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

export default router;
