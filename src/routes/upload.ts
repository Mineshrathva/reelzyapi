import { Request, Response, Router } from "express";
import multer from "multer";
import cloudinary from "./cloudinaryConfig"; // Aapka cloudinary config path
import db from "./dbConfig"; // Aapka database connection path

const router = Router();

// Multer Memory Storage setup (Multiple files ke liye)
const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
});

/**
 * POST /api/upload/:type
 * type = post | reel | story
 * Multiple files upload route
 */
router.post(
  "/:type",
  // authenticate, // Agar aapne auth middleware banaya hai toh ise enable rakhein
  upload.array("files", 50), // "files" key use karein, max 50 files ek saath
  async (req: Request & { user?: any }, res: Response) => {
    try {
      const { type } = req.params;
      const { caption, category, reel_length } = req.body;
      
      // Postman test ke liye agar user_id nahi hai toh static id use karein
      const user_id = req.user?.id || 1; 

      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const results = [];

      // Loop: Har file ke liye alag process chalega
      for (const file of files) {
        try {
          // 1. Cloudinary upload (Streaming buffer)
          const uploadToCloudinary = (): Promise<any> => {
            return new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  resource_type: "auto", // Video aur Image dono ke liye
                  folder: `reelzy/${type}`,
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );
              stream.end(file.buffer);
            });
          };

          const cloudinaryResult = await uploadToCloudinary();
          const mediaUrl = cloudinaryResult.secure_url;

          // 2. Database Insert (Jitni file, utni baar Query chalegi)
          const today = new Date().toISOString().split("T")[0];
          const finalCaption = caption && caption.trim() !== "" ? caption : today;

          let insertId;

          if (type === "post") {
            const [r]: any = await db.query(
              "INSERT INTO posts (user_id, image_url, caption) VALUES (?, ?, ?)",
              [user_id, mediaUrl, finalCaption]
            );
            insertId = r.insertId;
          } 
          else if (type === "reel") {
            const [r]: any = await db.query(
              `INSERT INTO reels (user_id, reel_url, caption, category, reel_length) VALUES (?, ?, ?, ?, ?)`,
              [user_id, mediaUrl, finalCaption, category || "", Number(reel_length) || 0]
            );
            insertId = r.insertId;
          } 
          else if (type === "story") {
            const [r]: any = await db.query(
              "INSERT INTO stories (user_id, media_url) VALUES (?, ?)",
              [user_id, mediaUrl]
            );
            insertId = r.insertId;
          }

          // Result array mein data add karein
          results.push({
            original_name: file.originalname,
            db_id: insertId,
            url: mediaUrl,
          });

        } catch (innerError) {
          console.error(`Error processing file ${file.originalname}:`, innerError);
          results.push({
            original_name: file.originalname,
            status: "failed",
            error: "Failed to upload or save to DB",
          });
        }
      }

      // Final Response
      return res.json({
        message: "Process completed",
        total_files: files.length,
        successful_uploads: results.filter(r => r.db_id).length,
        data: results,
      });

    } catch (err) {
      console.error("GLOBAL UPLOAD ERROR:", err);
      return res.status(500).json({ error: "Server error during multiple upload" });
    }
  }
);

export default router;
