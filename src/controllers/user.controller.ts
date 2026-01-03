import { Request, Response } from "express";
import { db } from "../config/db";
import bcrypt from "bcryptjs";
import { signToken } from "../utils/jwt";
import { validationResult } from "express-validator";

// Register
export const register = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, name, password } = req.body;

  try {
    const [rows]: any = await db.query("SELECT id FROM users WHERE username = ?", [username]);
    const existing = rows[0];

    if (existing) return res.status(409).json({ error: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result]: any = await db.query(
      "INSERT INTO users (username, name, password, points) VALUES (?, ?, ?, 0)",
      [username, name, hashedPassword]
    );

    const userId = result.insertId;
    const token = signToken({ id: userId });

    res.status(201).json({
      token,
      user: { id: userId, username, name, points: 0 },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, password } = req.body;

  try {
    const [rows]: any = await db.query(
      "SELECT id, username, name, password, points FROM users WHERE username = ?",
      [username]
    );
    const user = rows[0];

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ id: user.id });

    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name, points: user.points },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get Profile
export const getProfile = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [rows]: any = await db.query(
      "SELECT id, username, name, points, created_at FROM users WHERE id = ?",
      [userId]
    );
    const user = rows[0];

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      points: user.points,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
