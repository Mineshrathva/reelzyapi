import { Router, Request, Response } from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* =========================
   MULTER (MEMORY)
========================= */
const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

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
  upload.single("file"),
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const { type } = req.params;
      const { caption, category, reel_length } = req.body;
      const user_id = req.user!.id;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      /* ---------- Upload to Cloudinary ---------- */
      const result = await cloudinary.uploader.upload_stream(
        {
          resource_type: "auto", // image / video auto
          folder: `reelzy/${type}`,
        },
        async (error, uploadResult) => {
          if (error || !uploadResult) {
            console.error("Cloudinary error:", error);
            return res.status(500).json({ error: "Upload failed" });
          }

          const mediaUrl = uploadResult.secure_url;

          const today = new Date().toISOString().split("T")[0];
          const finalCaption =
            caption && caption.trim() !== "" ? caption : today;

          /* ---------- POST ---------- */
          if (type === "post") {
            const [r]: any = await db.query(
              "INSERT INTO posts (user_id, image_url, caption) VALUES (?, ?, ?)",
              [user_id, mediaUrl, finalCaption]
            );

            return res.json({
              message: "Post uploaded successfully",
              post_id: r.insertId,
              image_url: mediaUrl,
            });
          }

          /* ---------- REEL ---------- */
          if (type === "reel") {
            const [r]: any = await db.query(
              `INSERT INTO reels
               (user_id, reel_url, caption, category, reel_length)
               VALUES (?, ?, ?, ?, ?)`,
              [
                user_id,
                mediaUrl,
                finalCaption,
                category || "",
                Number(reel_length) || 0,
              ]
            );

            return res.json({
              message: "Reel uploaded successfully",
              reel_id: r.insertId,
              reel_url: mediaUrl,
            });
          }

          /* ---------- STORY ---------- */
          if (type === "story") {
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

            const [r]: any = await db.query(
              "INSERT INTO stories (user_id, media_url, expires_at) VALUES (?, ?, ?)",
              [user_id, mediaUrl, expiresAt]
            );

            return res.json({
              message: "Story uploaded successfully",
              story_id: r.insertId,
              media_url: mediaUrl,
            });
          }

          return res.status(400).json({ message: "Invalid upload type" });
        }
      );

      // write buffer to stream
      result.end(req.file.buffer);
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      return res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
