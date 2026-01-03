import { Router } from "express";
import { register, login, getProfile } from "../controllers/user.controller";
import { registerValidator, loginValidator } from "../validators/user.validator";
import { authenticate } from "../middleware/auth";

const router = Router();

// Register new user
router.post("/register", registerValidator, register);

// Login user
router.post("/login", loginValidator, login);

// Get logged-in user profile
router.get("/me", authenticate, getProfile);

export default router;
