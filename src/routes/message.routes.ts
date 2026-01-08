import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* =====================================================
   GET INBOX (All Chats for User)
===================================================== */
router.get("/inbox", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [rows]: any = await db.query(
      `
      SELECT 
        c.chat_id,
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

    res.json({
      success: true,
      inbox: rows || []
    });

  } catch (err) {
    console.error("INBOX ERROR:", err);
    res.status(500).json({ error: "Failed to load inbox" });
  }
});

/* =====================================================
   GET ALL MESSAGES IN A CHAT
===================================================== */
router.get("/:chatId", authenticate, async (req: any, res) => {
  try {
    const chatId = req.params.chatId;
    const userId = req.user.id;

    // Mark all messages in this chat as seen
    await db.query(
      `
      UPDATE messages
      SET seen = 1
      WHERE chat_id = ? AND receiver_id = ?
      `,
      [chatId, userId]
    );

    // Load messages
    const [messages]: any = await db.query(
      `
      SELECT m.*, u.username, u.profile_pic
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.chat_id = ?
      ORDER BY m.created_at ASC
      `,
      [chatId]
    );

    res.json({ success: true, data: messages });

  } catch (err) {
    console.error("LOAD MESSAGES ERROR:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/* =====================================================
   SEND MESSAGE (Auto-generate chat if not exists)
===================================================== */


router.post("/send", authenticate, async (req: any, res) => {
  try {
    const { receiver_id, message, media_url, type, duration } = req.body;
    const sender_id = req.user.id;

    const user1 = Math.min(sender_id, receiver_id);
    const user2 = Math.max(sender_id, receiver_id);

    /* Check existing chat */
    const [[existing]]: any = await db.query(
      `
      SELECT chat_id 
      FROM chats 
      WHERE user1_id = ? AND user2_id = ?
      `,
      [user1, user2]
    );

    let chat_id = existing?.chat_id;

    /* Create chat if not exists — DB will auto-generate chat_id */
    if (!chat_id) {
      const [insertResult]: any = await db.query(
        `
        INSERT INTO chats (user1_id, user2_id, last_message_at)
        VALUES (?, ?, NOW())
        `,
        [user1, user2]
      );

      // Fetch generated chat_id from DB
      const [[newChat]]: any = await db.query(
        `SELECT chat_id FROM chats WHERE id = ?`,
        [insertResult.insertId]
      );

      chat_id = newChat.chat_id;
    }

    /* Insert message */
    const [msgResult]: any = await db.query(
      `
      INSERT INTO messages 
      (chat_id, sender_id, receiver_id, type, message, media_url, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [chat_id, sender_id, receiver_id, type, message, media_url, duration]
    );

    res.json({
      success: true,
      chat_id,
      message_id: msgResult.insertId
    });

  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/* =====================================================
   MARK ALL MESSAGES FROM USER AS SEEN
===================================================== */
router.post("/seen", authenticate, async (req: any, res) => {
  try {
    const { userId } = req.body;
    const receiverId = req.user.id;

    await db.query(
      `
      UPDATE messages
      SET seen = 1
      WHERE sender_id = ? AND receiver_id = ?
      `,
      [userId, receiverId]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("SEEN ERROR:", err);
    res.status(500).json({ error: "Failed to mark seen" });
  }
});

/* =====================================================
   REACT TO MESSAGE
===================================================== */
router.post("/react", authenticate, async (req: any, res) => {
  try {
    const { message_id, reaction } = req.body;

    await db.query(
      `
      UPDATE messages 
      SET reaction = ? 
      WHERE id = ?
      `,
      [reaction, message_id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("REACTION ERROR:", err);
    res.status(500).json({ error: "Failed to react" });
  }
});

export default router;
