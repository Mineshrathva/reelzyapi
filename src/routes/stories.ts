import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* =====================================
   GET STORIES FROM FOLLOWING USERS
===================================== */
router.get("/", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [stories]: any = await db.query(
      `
      SELECT 
        s.id,
        s.user_id,
        u.username,
        u.profile_pic,
        s.media_url,
        s.created_at,
        s.expires_at
      FROM stories s
      JOIN users u ON u.id = s.user_id
      WHERE 
        s.expires_at > NOW()
        AND (
          s.user_id = ? 
          OR s.user_id IN (
            SELECT following_id 
            FROM follows 
            WHERE follower_id = ?
          )
        )
      ORDER BY s.created_at DESC
      `,
      [userId, userId]
    );

    res.json(stories);
  } catch (err) {
    console.error("GET STORIES ERROR:", err);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

export default router;
