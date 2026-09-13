import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../Modelo/baseDeDatos";
import { firmarToken } from "../Utilidades/sesion";
import { enviarCorreoDeRecuperacion } from "../Utilidades/correo";

const registerSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const AVATAR_COLOR_KEYS = ["green", "navy", "blue", "orange", "purple", "rose", "teal", "amber"] as const;

const updateMeSchema = z.object({
  name: z.string().min(2, "El nombre es muy corto").optional(),
  nickname: z.string().max(30).nullable().optional(),
  avatarColor: z.enum(AVATAR_COLOR_KEYS).nullable().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function registrarUsuario(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.usuario.create({
    data: { name, email, passwordHash },
  });

  const token = firmarToken({ userId: user.id });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      nickname: user.nickname,
      avatarColor: user.avatarColor,
    },
  });
}

export async function iniciarSesion(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Email o contraseña inválidos" });
  }
  const { email, password } = parsed.data;

  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  const token = firmarToken({ userId: user.id });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      nickname: user.nickname,
      avatarColor: user.avatarColor,
    },
  });
}

export async function miPerfil(req: Request & { userId?: string }, res: Response) {
  const user = await prisma.usuario.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, avatarUrl: true, nickname: true, avatarColor: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json(user);
}

export async function actualizarMiPerfil(req: Request & { userId?: string }, res: Response) {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const user = await prisma.usuario.update({
    where: { id: req.userId },
    data: parsed.data,
    select: { id: true, name: true, email: true, avatarUrl: true, nickname: true, avatarColor: true },
  });
  res.json(user);
}

// Mensaje genérico e idéntico exista o no la cuenta, para no revelar qué emails están registrados.
const FORGOT_PASSWORD_MESSAGE = "Si existe una cuenta con ese email, te mandamos un link para restablecer la contraseña.";

export async function olvideMiContrasena(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const user = await prisma.usuario.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = crypto.randomBytes(24).toString("hex");
    await prisma.tokenDeRecuperacion.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const webUrl = process.env.WEB_URL ?? "http://localhost:5173";
    const emailSent = await enviarCorreoDeRecuperacion({
      to: user.email,
      name: user.name,
      link: `${webUrl}/reset-password/${token}`,
    });
    if (!emailSent) {
      console.warn(`[olvideMiContrasena] no se pudo mandar el email a ${user.email}`);
    }
  }

  res.json({ message: FORGOT_PASSWORD_MESSAGE });
}

export async function restablecerContrasena(req: Request, res: Response) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { token, password } = parsed.data;

  const resetToken = await prisma.tokenDeRecuperacion.findUnique({ where: { token } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return res.status(400).json({ error: "El link para restablecer la contraseña es inválido o venció" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.usuario.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.tokenDeRecuperacion.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  res.json({ message: "Contraseña actualizada" });
}
