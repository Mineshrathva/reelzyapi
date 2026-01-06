import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* ===============================
   MY PROFILE (FROM JWT TOKEN)
================================ */
router.get("/", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id; // ✅ from JWT

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
        (SELECT COUNT(*) FROM reels r WHERE r.user_id = u.id) AS posts_count
      FROM users u
      WHERE u.id = ?
      `,
      [userId]
    );

    if (!profileRows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    /* User reels */
    const [reels]: any = await db.query(
      `
      SELECT id, reel_url, likes_count, views_count, created_at
      FROM reels
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [userId]
    );
    const [posts]: any = await db.query(
      `
      SELECT id, image_url, likes_count, views_count, created_at
      FROM posts
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [userId]
    );
    res.json({
      profile: profileRows[0],
      reels,
      posts,
    });

  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({ error: "Profile page error" });
  }
});

export default router;
