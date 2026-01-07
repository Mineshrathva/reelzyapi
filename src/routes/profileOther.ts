import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* =====================================
   GET USER PROFILE
===================================== */
router.get("/:userId", authenticate, async (req: any, res) => {
  try {
    const viewerId = req.user.id;
    const profileUserId = req.params.userId;

    const [profileRows]: any = await db.query(
      `
      SELECT
        u.id,
        u.username,
        u.bio,
        u.profile_pic,

        /* Total Posts (image posts + reels) */
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id)
        + (SELECT COUNT(*) FROM reels WHERE user_id = u.id)
        AS posts_count,

        /* Followers */
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id)
        AS followers_count,

        /* Following */
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id)
        AS following_count,

        /* Check if viewer follows this user */
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

    /* POSTS */
    const [posts]: any = await db.query(
      `
      SELECT id, image_url, likes_count, comments_count, created_at
      FROM posts
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [profileUserId]
    );

    /* REELS */
    const [reels]: any = await db.query(
      `
      SELECT id, reel_url, likes_count, views_count, created_at
      FROM reels
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [profileUserId]
    );

    /* ACTIVE STORY */
    const [[story]]: any = await db.query(
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
        ...profile,
        is_following: !!profile.is_following,
        has_story: story.has_story > 0,
      },
      posts,
      reels,
    });
  } catch (err) {
    console.error("OTHER PROFILE ERROR:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});


/* =====================================
   FOLLOW USER
===================================== */
router.post("/:userId/follow", authenticate, async (req: any, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    if (followerId == followingId) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    await db.query(
      `INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`,
      [followerId, followingId]
    );

    // FETCH UPDATED COUNTS
    const [[counts]]: any = await db.query(
      `
      SELECT
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) AS followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) AS following_count
      `,
      [followingId, followerId]
    );

    res.json({
      success: true,
      is_following: true,
      followers_count: counts.followers_count,
      following_count: counts.following_count,
    });
  } catch (err) {
    console.error("FOLLOW ERROR:", err);
    res.status(500).json({ error: "Failed to follow user" });
  }
});


/* =====================================
   UNFOLLOW USER
===================================== */
router.delete("/:userId/follow", authenticate, async (req: any, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    await db.query(
      `DELETE FROM follows WHERE follower_id = ? AND following_id = ?`,
      [followerId, followingId]
    );

    // FETCH UPDATED COUNTS
    const [[counts]]: any = await db.query(
      `
      SELECT
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) AS followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) AS following_count
      `,
      [followingId, followerId]
    );

    res.json({
      success: true,
      is_following: false,
      followers_count: counts.followers_count,
      following_count: counts.following_count,
    });
  } catch (err) {
    console.error("UNFOLLOW ERROR:", err);
    res.status(500).json({ error: "Failed to unfollow user" });
  }
});

export default router;
