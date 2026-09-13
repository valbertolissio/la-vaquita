import { Router } from "express";
import { forgotPassword, login, me, register, resetPassword, updateMe } from "../Controlador/authController";
import { requireAuth } from "../Intermediarios/auth";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/forgot-password", forgotPassword);
authRoutes.post("/reset-password", resetPassword);
authRoutes.get("/me", requireAuth, me);
authRoutes.patch("/me", requireAuth, updateMe);
