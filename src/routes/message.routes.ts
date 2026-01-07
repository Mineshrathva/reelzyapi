import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* ============================
   GET CHAT MESSAGES
=============================== */
router.get("/:chatId", authenticate, async (req: any, res) => {
  try {
    const chatId = req.params.chatId;
    const userId = req.user.id;

    /* Mark all as seen */
    await db.query(
      `
      UPDATE messages
      SET seen = 1
      WHERE receiver_id = ?

      `,
      [chatId, userId]
    );

    const [messages]: any = await db.query(
      `
      SELECT * FROM messages
      WHERE chat_id = ?
      ORDER BY created_at ASC
      `,
      [chatId]
    );

    res.json(messages);
  } catch (err) {
    console.error("LOAD MESSAGES ERROR:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/* ============================
   SEND MESSAGE
=============================== */
router.post("/send", authenticate, async (req: any, res) => {
  try {
    const { chat_id, receiver_id, message, media_url, type, duration } = req.body;
    const sender_id = req.user.id;

    const [r]: any = await db.query(
      `
      INSERT INTO messages 
      (chat_id, sender_id, receiver_id, type, message, media_url, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [chat_id, sender_id, receiver_id, type, message, media_url, duration]
    );

    /* Update chat last message info */
    await db.query(
      `
      UPDATE chats
      SET last_message = ?, last_message_at = NOW(),
          unread_for_user1 = unread_for_user1 + IF(user1_id = ?, 0, 1),
          unread_for_user2 = unread_for_user2 + IF(user2_id = ?, 0, 1)
      WHERE id = ?
      `,
      [message || "[Media]", sender_id, sender_id, chat_id]
    );

    res.json({ success: true, message_id: r.insertId });
  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/* ============================
   REACT TO MESSAGE
=============================== */
router.post("/react", authenticate, async (req: any, res) => {
  try {
    const { message_id, reaction } = req.body;

    await db.query(
      `UPDATE messages SET reaction = ? WHERE id = ?`,
      [reaction, message_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("REACTION ERROR:", err);
    res.status(500).json({ error: "Failed to react" });
  }
});

export default router;
