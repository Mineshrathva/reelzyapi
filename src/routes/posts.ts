import { Router } from "express";
import{ db }from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* ===============================
   LIKE / UNLIKE POST
================================ */
router.post("/:postId/like", authenticate, async (req: any, res) => {
  const userId = req.user.id;
  const postId = req.params.postId;

  const [exists]: any = await db.query(
    "SELECT 1 FROM post_likes WHERE user_id=? AND post_id=?",
    [userId, postId]
  );

  if (exists.length) {
    await db.query(
      "DELETE FROM post_likes WHERE user_id=? AND post_id=?",
      [userId, postId]
    );
    await db.query(
      "UPDATE posts SET likes_count = likes_count - 1 WHERE id=?",
      [postId]
    );
    return res.json({ liked: false });
  }

  await db.query(
    "INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)",
    [userId, postId]
  );

  await db.query(
    "UPDATE posts SET likes_count = likes_count + 1 WHERE id=?",
    [postId]
  );

  res.json({ liked: true });
});

/* ===============================
   COMMENT POST
================================ */
router.post("/:postId/comment", authenticate, async (req: any, res) => {
  const { comment } = req.body;
  const userId = req.user.id;
  const postId = req.params.postId;

  await db.query(
    "INSERT INTO post_comments (user_id, post_id, comment) VALUES (?, ?, ?)",
    [userId, postId, comment]
  );

  await db.query(
    "UPDATE posts SET comments_count = comments_count + 1 WHERE id=?",
    [postId]
  );

  res.json({ message: "Comment added" });
});

/* ===============================
   SAVE / UNSAVE POST
================================ */
router.post("/:postId/save", authenticate, async (req: any, res) => {
  const userId = req.user.id;
  const postId = req.params.postId;

  const [exists]: any = await db.query(
    "SELECT 1 FROM saved_posts WHERE user_id=? AND post_id=?",
    [userId, postId]
  );

  if (exists.length) {
    await db.query(
      "DELETE FROM saved_posts WHERE user_id=? AND post_id=?",
      [userId, postId]
    );
    return res.json({ saved: false });
  }

  await db.query(
    "INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)",
    [userId, postId]
  );

  res.json({ saved: true });
});

/* ===============================
   GET SAVED POSTS
================================ */
router.get("/saved", authenticate, async (req: any, res) => {
  const userId = req.user.id;

  const [posts]: any = await db.query(
    `SELECT p.*
     FROM saved_posts sp
     JOIN posts p ON p.id = sp.post_id
     WHERE sp.user_id = ?
     ORDER BY sp.created_at DESC`,
    [userId]
  );

  res.json(posts);
});

export default router;
