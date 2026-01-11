import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { db } from "../config/db";

const router = Router();

/* =====================================================
   FOR YOU FEED (Algorithm + Reposts) — FIXED
===================================================== */
router.get("/", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT
        r.*,
        u.username,
        u.profile_pic,

        -- repost flag
        EXISTS (
          SELECT 1
          FROM reel_repost rr
          WHERE rr.reel_id = r.id
        ) AS is_reposted,

        (
          (r.views_count * 0.2) +
          (r.likes_count * 2) +
          (r.comments_count * 3) +

          -- follow boost
          EXISTS (
            SELECT 1 FROM follows f
            WHERE f.following_id = r.user_id
              AND f.follower_id = ?
          ) * 5 +

          -- repost boost
          EXISTS (
            SELECT 1 FROM reel_repost rr
            WHERE rr.reel_id = r.id
          ) * 8 +

          -- freshness
          GREATEST(0, 24 - TIMESTAMPDIFF(HOUR, r.created_at, NOW()))
        ) AS score

      FROM reels r
      JOIN users u ON u.id = r.user_id
r.type
      ORDER BY score DESC
      LIMIT 20
    `;

    const [rows] = await db.query(sql, [userId]);

    res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("FEED ERROR:", error.sqlMessage || error);
    res.status(500).json({ success: false, message: error.sqlMessage });
  }
});

/* =====================================================
   FOLLOWING FEED (Original + Reposted by Following) — FIXED
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
      JOIN users u ON u.id = r.user_id

      WHERE
        r.user_id IN (
          SELECT following_id
          FROM follows
          WHERE follower_id = ?
        )
        OR r.id IN (
          SELECT rr.reel_id
          FROM reel_repost rr
          WHERE rr.user_id IN (
            SELECT following_id
            FROM follows
            WHERE follower_id = ?
          )
        )

      ORDER BY r.created_at DESC
      LIMIT 20
    `;

    const [rows] = await db.query(sql, [userId, userId]);

    res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("FOLLOWING ERROR:", error.sqlMessage || error);
    res.status(500).json({ success: false, message: error.sqlMessage });
  }
});

/* =====================================================
   TRENDING / EXPLORE (Repost Boost) — FIXED
===================================================== */
router.get("/trending", async (_req, res) => {
  try {
    const sql = `
      SELECT
        r.*,
        u.username,
        u.profile_pic,

        (
          SELECT COUNT(*)
          FROM reel_repost rr
          WHERE rr.reel_id = r.id
        ) AS repost_count

      FROM reels r
      JOIN users u ON u.id = r.user_id

      WHERE r.created_at > NOW() - INTERVAL 24 HOUR

      ORDER BY
        repost_count DESC,
        r.views_count DESC,
        r.likes_count DESC

      LIMIT 20
    `;

    const [rows] = await db.query(sql);

    res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("TRENDING ERROR:", error.sqlMessage || error);
    res.status(500).json({ success: false, message: error.sqlMessage });
  }
});

export default router;
