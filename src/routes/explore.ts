import { Router } from "express";
import{ db }from "../config/db";

const router = Router();

/* ===============================
   EXPLORE FEED WITH PAGINATION
================================ */
router.get("/", async (req, res) => {
  try {
    // ✅ Get page & limit from query string
    let page = parseInt(req.query.page as string) || 1;
    let limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const sql = `
      (
        SELECT
          r.id,
          r.user_id,
          r.video_url AS media_url,
          'reel' AS type,
          r.views_count,
          r.likes_count,
          r.comments_count,
          (
            (r.views_count * 0.3) +
            (r.likes_count * 2) +
            (r.comments_count * 3) +
            GREATEST(0, 24 - TIMESTAMPDIFF(HOUR, r.created_at, NOW()))
          ) AS score,
          r.created_at
        FROM reels r
      )
      UNION ALL
      (
        SELECT
          p.id,
          p.user_id,
          p.image_url AS media_url,
          'post' AS type,
          0 AS views_count,
          p.likes_count,
          p.comments_count,
          (
            (p.likes_count * 2) +
            (p.comments_count * 3) +
            GREATEST(0, 24 - TIMESTAMPDIFF(HOUR, p.created_at, NOW()))
          ) AS score,
          p.created_at
        FROM posts p
      )
      ORDER BY score DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(sql, [limit, offset]);
    res.json({
      page,
      limit,
      data: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Explore feed error" });
  }
});

export default router;
