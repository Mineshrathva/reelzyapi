import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* ===============================
   EXPLORE FEED (POSTS ONLY)
================================ */
router.get("/", authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const sql = `
      SELECT
        p.id,
        p.user_id,
        u.username,                 -- ✅ ADD THIS
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
      JOIN users u ON u.id = p.user_id   -- ✅ ADD THIS
      ORDER BY score DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(sql, [limit, offset]);

    res.json({
      page,
      limit,
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Explore feed error" });
  }
});

export default router;
