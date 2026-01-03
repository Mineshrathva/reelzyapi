import { body } from "express-validator";

export const registerValidator = [
  body("username").trim().isLength({ min: 3 }),
  body("name").trim().notEmpty(),
  body("password").isLength({ min: 6 }),
];

export const loginValidator = [
  body("username").trim().notEmpty(),
  body("password").notEmpty(),
];
