import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { db } from "../config/db";

const router = Router();

/* ===============================
   FOR YOU FEED
================================ */
router.get("/feed", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        r.*,
        u.username,
        (
          (r.views_count * 0.2) +
          (r.likes_count * 2) +
          (r.comments_count * 3) +
          IF(f.follower_id IS NOT NULL, 5, 0) +
          GREATEST(0, 24 - TIMESTAMPDIFF(HOUR, r.created_at, NOW()))
        ) AS score
      FROM reels r
      JOIN users u ON u.id = r.user_id          -- ✅ ADD THIS
      LEFT JOIN follows f
        ON f.following_id = r.user_id
       AND f.follower_id = ?
      ORDER BY score DESC
      LIMIT 20
    `;

    const [rows] = await db.query(sql, [userId]);

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Feed error" });
  }
});
/* ===============================
   FOLLOWING FEED
================================ */
router.get("/following", authenticate, async (req: any, res) => {
  const userId = req.user.id;

  const [rows] = await db.query(
    `
    SELECT 
      r.*,
      u.username
    FROM reels r
    JOIN users u ON u.id = r.user_id        -- ✅ ADD THIS
    JOIN follows f ON f.following_id = r.user_id
    WHERE f.follower_id = ?
    ORDER BY r.created_at DESC
    LIMIT 20
    `,
    [userId]
  );

  res.json({
    success: true,
    data: rows,
  });
});


/* ===============================
   TRENDING / EXPLORE
================================ */
router.get("/trending", async (_req, res) => {
  const [rows] = await db.query(`
    SELECT 
      r.*,
      u.username
    FROM reels r
    JOIN users u ON u.id = r.user_id        -- ✅ ADD THIS
    WHERE r.created_at > NOW() - INTERVAL 24 HOUR
    ORDER BY r.views_count DESC, r.likes_count DESC
    LIMIT 20
  `);

  res.json({
    success: true,
    data: rows,
  });
});


export default router;
