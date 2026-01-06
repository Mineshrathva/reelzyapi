import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { db } from "../config/db";

const router = Router();

/* =====================================================
   FOR YOU FEED (Algorithm + Reposts)
===================================================== */
router.get("/feed", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        r.*,
        u.username,
        u.profile_pic,

        -- repost info
        IF(rr.user_id IS NOT NULL, 1, 0) AS is_reposted,

        (
          (r.views_count * 0.2) +
          (r.likes_count * 2) +
          (r.comments_count * 3) +
          IF(f.follower_id IS NOT NULL, 5, 0) +
          IF(rr.user_id IS NOT NULL, 8, 0) +
          GREATEST(0, 24 - TIMESTAMPDIFF(HOUR, r.created_at, NOW()))
        ) AS score

      FROM reels r

      JOIN users u 
        ON u.id = r.user_id

      LEFT JOIN follows f
        ON f.following_id = r.user_id
       AND f.follower_id = ?

      LEFT JOIN reel_repost rr
        ON rr.reel_id = r.id

      GROUP BY r.id
      ORDER BY score DESC
      LIMIT 20
    `;

    const [rows] = await db.query(sql, [userId]);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Feed error" });
  }
});

/* =====================================================
   FOLLOWING FEED (Original + Reposted by Following)
===================================================== */
router.get("/following", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT DISTINCT
        r.*,
        u.username,
        u.profile_pic
      FROM reels r

      JOIN users u 
        ON u.id = r.user_id

      LEFT JOIN reel_repost rr
        ON rr.reel_id = r.id

      JOIN follows f
        ON (
             f.following_id = r.user_id
          OR f.following_id = rr.user_id
        )
       AND f.follower_id = ?

      ORDER BY r.created_at DESC
      LIMIT 20
    `;

    const [rows] = await db.query(sql, [userId]);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Following feed error" });
  }
});

/* =====================================================
   TRENDING / EXPLORE (Repost Boost)
===================================================== */
router.get("/trending", async (_req, res) => {
  try {
    const sql = `
      SELECT 
        r.*,
        u.username,
        u.profile_pic,
        COUNT(rr.reel_id) AS repost_count
      FROM reels r

      JOIN users u 
        ON u.id = r.user_id

      LEFT JOIN reel_repost rr
        ON rr.reel_id = r.id

      WHERE r.created_at > NOW() - INTERVAL 24 HOUR
      GROUP BY r.id
      ORDER BY 
        repost_count DESC,
        r.views_count DESC,
        r.likes_count DESC
      LIMIT 20
    `;

    const [rows] = await db.query(sql);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Trending feed error" });
  }
});

export default router;
