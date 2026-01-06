import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* =====================================
   GET OTHER USER PROFILE
===================================== */
router.get("/:userId", authenticate, async (req: any, res) => {
  try {
    const viewerId = req.user.id;          // logged-in user
    const profileUserId = req.params.userId; // whose profile

    /* =========================
       USER BASIC INFO + STATS
    ========================= */
    const [profileRows]: any = await db.query(
      `
      SELECT
        u.id,
        u.username,
        u.bio,
        u.profile_pic,

        (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id)
        + (SELECT COUNT(*) FROM reels r WHERE r.user_id = u.id)
        AS posts_count,

        (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id)
        AS followers_count,

        (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id)
        AS following_count,

        EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id = ? AND following_id = u.id
        ) AS is_following

      FROM users u
      WHERE u.id = ?
      `,
      [viewerId, profileUserId]
    );

    if (!profileRows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const profile = profileRows[0];

    /* =========================
       USER POSTS
    ========================= */
    const [posts]: any = await db.query(
      `
      SELECT
        id,
        image_url,
        likes_count,
        comments_count,
        created_at
      FROM posts
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [profileUserId]
    );

    /* =========================
       USER REELS
    ========================= */
    const [reels]: any = await db.query(
      `
      SELECT
        id,
        reel_url,
        likes_count,
        views_count,
        created_at
      FROM reels
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [profileUserId]
    );

    /* =========================
       ACTIVE STORY CHECK
    ========================= */
    const [storyRows]: any = await db.query(
      `
      SELECT COUNT(*) AS has_story
      FROM stories
      WHERE user_id = ?
        AND expires_at > NOW()
      `,
      [profileUserId]
    );

    res.json({
      profile: {
        id: profile.id,
        username: profile.username,
        bio: profile.bio,
        profile_pic: profile.profile_pic,
        posts_count: profile.posts_count,
        followers_count: profile.followers_count,
        following_count: profile.following_count,
        is_following: !!profile.is_following,
        has_story: storyRows[0].has_story > 0,
      },
      posts,
      reels,
    });
  } catch (err) {
    console.error("OTHER PROFILE ERROR:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
