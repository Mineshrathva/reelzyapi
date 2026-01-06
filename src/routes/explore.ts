import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* ===============================
   EXPLORE FEED (POSTS ONLY)
================================ */
router.post("/", authenticate, async (req: any, res) => {
  try {
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

        EXISTS (
          SELECT 1 FROM post_repost pr
          WHERE pr.post_id = p.id
        ) AS is_reposted,

        0 AS views_count,
        p.likes_count,
        p.comments_count,

        (
          (p.likes_count * 2) +
          (p.comments_count * 3) +
          EXISTS (
            SELECT 1 FROM post_repost pr
            WHERE pr.post_id = p.id
          ) * 6 +
          GREATEST(0, 24 - TIMESTAMPDIFF(HOUR, p.created_at, NOW()))
        ) AS score,

        p.created_at

      FROM posts p
      JOIN users u ON u.id = p.user_id
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
  } catch (error: any) {
    console.error("Explore Feed SQL Error:", error.sqlMessage || error);
    res.status(500).json({
      success: false,
      message: error.sqlMessage || "Explore feed error",
    });
  }
});


export default router;
