import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";
import crypto from "crypto";

const router = Router();

/* ===============================
   INBOX - SHOW ALL CHATS
================================ */
router.get("/inbox", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    /* ============================
       1. Fetch all chats user belongs to
    ============================ */
    const [chats]: any = await db.query(
      `
      SELECT 
        c.chat_id,
        c.userA,
        c.userB,
        c.chat_type,

        /* identify the other person */
        IF(c.userA = ?, c.userB, c.userA) AS other_user_id
      FROM chats c
      WHERE c.userA = ? OR c.userB = ?
      ORDER BY c.created_at DESC
      `,
      [userId, userId, userId]
    );

    if (!chats.length) {
      return res.json({ success: true, inbox: [] });
    }

    /* ============================
       2. Prepare inbox response
    ============================ */
    const inbox = [];

    for (const chat of chats) {
      const otherId = chat.other_user_id;

      /* Get other user info */
      const [[otherUser]]: any = await db.query(
        `
        SELECT id, username, profile_pic 
        FROM users 
        WHERE id = ?
        `,
        [otherId]
      );

      /* Get last message */
      const [[lastMsg]]: any = await db.query(
        `
        SELECT id, sender_id, message, media_url, type, created_at
        FROM messages
        WHERE chat_id = ?
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [chat.chat_id]
      );

      /* Get unread messages count */
      const [[unread]]: any = await db.query(
        `
        SELECT COUNT(*) AS unread
        FROM messages
        WHERE chat_id = ?
          AND receiver_id = ?
          AND seen = 0
        `,
        [chat.chat_id, userId]
      );

      inbox.push({
        chat_id: chat.chat_id,
        user: {
          id: otherUser.id,
          username: otherUser.username,
          profile_pic: otherUser.profile_pic
        },
        last_message: lastMsg || null,
        unread: unread.unread
      });
    }

    res.json({ success: true, inbox });

  } catch (err) {
    console.error("INBOX ERROR:", err);
    res.status(500).json({ error: "Failed to load inbox" });
  }
});


/* ============================
   GET CHAT MESSAGES
=============================== */
router.get("/:chatId", authenticate, async (req: any, res) => {
  try {
    const chatId = req.params.chatId;
    const userId = req.user.id;

    /* Mark messages of THIS chat as seen */
    await db.query(
      `
      UPDATE messages
      SET seen = 1
      WHERE chat_id = ? AND receiver_id = ?
      `,
      [chatId, userId]
    );

    /* Load messages for chat */
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

/* ============================
   SEND MESSAGE
=============================== */
/* ============================
   SEND MESSAGE (AUTO-GENERATE chat_id)
   
=============================== */

function generateChatId() {
  return crypto.randomBytes(16).toString("hex"); // 32-char secure ID
}
router.post("/send", authenticate, async (req: any, res) => {
  try {
    const { receiver_id, message, media_url, type, duration } = req.body;
    const sender_id = req.user.id;

    /* Always use sorted pair for lookup */
    const userA = Math.min(sender_id, receiver_id);
    const userB = Math.max(sender_id, receiver_id);

    /* Check existing chat */
    const [[existingChat]]: any = await db.query(
      `SELECT chat_id FROM chats WHERE userA=? AND userB=?`,
      [userA, userB]
    );

    let chat_id = existingChat?.chat_id;

    /* If no chat, create new strong chat_id */
    if (!chat_id) {
      chat_id = generateChatId();

      await db.query(
        `INSERT INTO chats (chat_id, userA, userB) VALUES (?, ?, ?)`,
        [chat_id, userA, userB]
      );
    }

    /* Insert message */
    const [result]: any = await db.query(
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
      message_id: result.insertId
    });

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
