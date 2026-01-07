import { Router } from "express";
import { register, login, getProfile } from "../controllers/user.controller";
import { registerValidator, loginValidator } from "../validators/user.validator";
import { authenticate } from "../middleware/auth";

const router = Router();

// Register new user
router.post("/register", registerValidator, register);

// Login user
router.post("/login", loginValidator, login);

// Get logged-in user profile  🔥 FIXED (no more 304 caching)
router.get("/me", authenticate, (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  next();
}, getProfile);

export default router;
