import { Router, Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { db } from "../config/db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* =========================
   MULTER (TEMP STORAGE)
========================= */
const upload = multer({
  dest: "tmp/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

/* =========================
   GOOGLE DRIVE SETUP
========================= */
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON!),
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID!;

/* =========================
   GOOGLE DRIVE UPLOAD
========================= */
async function uploadToDrive(
  filePath: string,
  originalName: string,
  mimeType: string
): Promise<string> {
  const fileName =
    Date.now() +
    "-" +
    Math.round(Math.random() * 1e9) +
    path.extname(originalName);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [DRIVE_FOLDER_ID],
    },
    media: {
      mimeType,
      body: fs.createReadStream(filePath),
    },
    fields: "id",
  });

  const fileId = response.data.id!;
  
  // make public
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return `https://drive.google.com/uc?id=${fileId}`;
}

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
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const { type } = req.params;
      const { caption, category, reel_length } = req.body;
      const user_id = req.user!.id;

      const files: any = req.files;

      const uploadedFile =
        files?.file?.[0] ||
        files?.video?.[0] ||
        files?.image?.[0];

      if (!uploadedFile) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const driveUrl = await uploadToDrive(
        uploadedFile.path,
        uploadedFile.originalname,
        uploadedFile.mimetype
      );

      // delete temp file
      fs.unlinkSync(uploadedFile.path);

      const today = new Date().toISOString().split("T")[0];
      const finalCaption =
        caption && caption.trim() !== "" ? caption : today;

      /* ---------- POST ---------- */
      if (type === "post") {
        const [result]: any = await db.query(
          "INSERT INTO posts (user_id, image_url, caption) VALUES (?, ?, ?)",
          [user_id, driveUrl, finalCaption]
        );

        return res.json({
          message: "Post uploaded successfully",
          post_id: result.insertId,
          image_url: driveUrl,
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
            driveUrl,
            finalCaption,
            category || "",
            Number(reel_length) || 0,
          ]
        );

        return res.json({
          message: "Reel uploaded successfully",
          reel_id: result.insertId,
          reel_url: driveUrl,
        });
      }

      /* ---------- STORY ---------- */
      if (type === "story") {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const [result]: any = await db.query(
          "INSERT INTO stories (user_id, media_url, expires_at) VALUES (?, ?, ?)",
          [user_id, driveUrl, expiresAt]
        );

        return res.json({
          message: "Story uploaded successfully",
          story_id: result.insertId,
          media_url: driveUrl,
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
