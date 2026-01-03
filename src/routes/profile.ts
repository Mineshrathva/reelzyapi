import { Router } from "express";
import{ db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* ===============================
   PROFILE PAGE
================================ */
router.get("/:userId", authenticate, async (req: any, res) => {
  try {
    const viewerId = req.user.id;
    const profileUserId = Number(req.params.userId);

    /* Profile info + stats */
    const [profileRows]: any = await db.query(
      `
      SELECT
        u.id,
        u.username,
        u.bio,
        u.profile_pic,
        (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) AS followers_count,
        (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) AS following_count,
        (SELECT COUNT(*) FROM reels r WHERE r.user_id = u.id) AS posts_count,
        EXISTS (
          SELECT 1 FROM follows f
          WHERE f.follower_id = ? AND f.following_id = u.id
        ) AS is_following
      FROM users u
      WHERE u.id = ?
      `,
      [viewerId, profileUserId]
    );

    if (!profileRows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    /* User reels */
    const [reels]: any = await db.query(
      `
      SELECT id, video_url, likes_count, views_count, created_at
      FROM reels
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [profileUserId]
    );

    res.json({
      profile: profileRows[0],
      reels
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Profile page error" });
  }
});

export default router;
