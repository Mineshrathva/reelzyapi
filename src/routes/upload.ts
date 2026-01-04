import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* =========================
   MULTER CONFIG
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type;

    let folder = "uploads/posts";
    if (type === "reel") folder = "uploads/reels";
    if (type === "story") folder = "uploads/stories";

    // ✅ Auto-create folder
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/* =========================
   UPLOAD ROUTE
========================= */
/**
 * POST /api/upload/:type
 * type = post | reel | story
 */

router.post(
  "/:type",
  authenticate,
  upload.single("file") as any,
  async (req: Request & { user?: any }, res: Response) => {
    try {
      console.log("UPLOAD HIT");

      const { type } = req.params;
      const { caption, category, reel_length } = req.body;
      const user_id = req.user!.id;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Caption empty → current date
      const today = new Date().toISOString().split("T")[0];
      const finalCaption =
        caption && caption.trim() !== "" ? caption : today;

      const filePath = req.file.path.replace(/\\/g, "/");

      /* ---------- POST ---------- */
      if (type === "post") {
        const [result]: any = await db.query(
          "INSERT INTO posts (user_id, image_url, caption) VALUES (?, ?, ?)",
          [user_id, filePath, finalCaption]
        );

        return res.json({
          message: "Post uploaded successfully",
          post_id: result.insertId,
          image_url: filePath,
        });
      }

      /* ---------- REEL ---------- */
      if (type === "reel") {
        const [result]: any = await db.query(
          `INSERT INTO reels
           (user_id, reel_url, caption, category, reel_length)
           VALUES (?, ?, ?, ?, ?)`,
          [
            user_id,
            filePath,
            finalCaption,
            category || "",
            Number(reel_length) || 0,
          ]
        );

        return res.json({
          message: "Reel uploaded successfully",
          reel_id: result.insertId,
          reel_url: filePath,
        });
      }

      /* ---------- STORY ---------- */
      if (type === "story") {
        const expiresAt = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        );

        const [result]: any = await db.query(
          "INSERT INTO stories (user_id, media_url, expires_at) VALUES (?, ?, ?)",
          [user_id, filePath, expiresAt]
        );

        return res.json({
          message: "Story uploaded successfully",
          story_id: result.insertId,
          media_url: filePath,
        });
      }

      return res.status(400).json({ message: "Invalid upload type" });
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      return res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
