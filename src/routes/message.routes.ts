import { Router } from "express";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";
import crypto from "crypto";

const router = Router();

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
