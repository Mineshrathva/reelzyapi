import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* =====================================================
   EXPLORE FEED (POSTS + REPOST SUPPORT)
===================================================== */
router.get("/", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT
        p.id,
        p.user_id,
        u.username,
        u.profile_pic,
        p.image_url AS media_url,
        'post' AS type,

        -- repost info
        IF(pr.user_id IS NOT NULL, 1, 0) AS is_reposted,

        0 AS views_count,
        p.likes_count,
        p.comments_count,

        (
          (p.likes_count * 2) +
          (p.comments_count * 3) +
          IF(pr.user_id IS NOT NULL, 6, 0) +   -- 🔥 repost boost
          GREATEST(0, 24 - TIMESTAMPDIFF(HOUR, p.created_at, NOW()))
        ) AS score,

        p.created_at

      FROM posts p

      JOIN users u
        ON u.id = p.user_id

      LEFT JOIN post_repost pr
        ON pr.post_id = p.id

      GROUP BY p.id
      ORDER BY score DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(sql, [limit, offset]);

    res.json({
      success: true,
      page,
      limit,
      data: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Explore feed error" });
  }
});

export default router;
