import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* ============================
   GET USER CHAT LIST (Inbox)
=============================== */
router.get("/", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [rows]: any = await db.query(
      `
      SELECT 
       c.chat_id AS chat_id,
        c.user1_id,
        c.user2_id,
        c.last_message,
        c.last_message_at,

        CASE WHEN c.user1_id = ? THEN c.unread_for_user1 
             ELSE c.unread_for_user2 END AS unread,

        u.id AS other_user_id,
        u.username,
        u.profile_pic

      FROM chats c
      JOIN users u 
        ON u.id = IF(c.user1_id = ?, c.user2_id, c.user1_id)

      WHERE c.user1_id = ? OR c.user2_id = ?
      ORDER BY c.last_message_at DESC
    `,
      [userId, userId, userId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("CHAT LIST ERROR:", err);
    res.status(500).json({ error: "Failed to load inbox" });
  }
});

/* ============================
   START/OPEN CHAT
=============================== */
router.post("/start/:receiverId", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const receiverId = req.params.receiverId;

    const [exist]: any = await db.query(
      `
      SELECT * FROM chats 
      WHERE (user1_id = ? AND user2_id = ?)
         OR (user1_id = ? AND user2_id = ?)
      `,
      [userId, receiverId, receiverId, userId]
    );

    if (exist.length) {
      return res.json({ chat_id: exist[0].id });
    }

    const [r]: any = await db.query(
      `
      INSERT INTO chats (user1_id, user2_id, last_message_at)
      VALUES (?, ?, NOW())
      `,
      [userId, receiverId]
    );

    res.json({ chat_id: r.insertId });
  } catch (err) {
    console.error("START CHAT ERROR:", err);
    res.status(500).json({ error: "Failed to start chat" });
  }
});

export default router;
