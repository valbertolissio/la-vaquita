import { Router } from "express";
import { login, me, register } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.get("/me", requireAuth, me);
