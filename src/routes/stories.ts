import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* =====================================
   GET STORIES FROM FOLLOWING USERS
===================================== */
router.get("/", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [rows]: any = await db.query(
      `
      SELECT
        u.id AS user_id,
        u.username,
        u.profile_pic,

        MAX(s.created_at) AS latest_story_time,

        SUM(
          CASE 
            WHEN sv.story_id IS NULL THEN 1 
            ELSE 0 
          END
        ) AS unseen_count,

        CASE 
          WHEN u.id = ? THEN 1 
          ELSE 0 
        END AS is_me

      FROM stories s
      JOIN users u ON u.id = s.user_id

      LEFT JOIN story_views sv
        ON sv.story_id = s.id
        AND sv.user_id = ?

      WHERE
        s.expires_at > NOW()
        AND (
          s.user_id = ?
          OR s.user_id IN (
            SELECT following_id
            FROM follows
            WHERE follower_id = ?
          )
        )

      GROUP BY u.id

      ORDER BY
        is_me DESC,
        unseen_count DESC,
        latest_story_time DESC
      `,
      [userId, userId, userId, userId]
    );

    res.json(
      rows.map((r: any) => ({
        user_id: r.user_id,
        username: r.username,
        profile_pic: r.profile_pic,
        is_me: !!r.is_me,
        has_unseen: r.unseen_count > 0,
        latest_story_time: r.latest_story_time,
      }))
    );
  } catch (err) {
    console.error("GET STORIES ERROR:", err);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

export default router;
