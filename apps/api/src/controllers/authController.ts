import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";

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

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const token = signToken({ userId: user.id });
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

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Email o contraseña inválidos" });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  const token = signToken({ userId: user.id });
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

export async function me(req: Request & { userId?: string }, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, avatarUrl: true, nickname: true, avatarColor: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json(user);
}

export async function updateMe(req: Request & { userId?: string }, res: Response) {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: parsed.data,
    select: { id: true, name: true, email: true, avatarUrl: true, nickname: true, avatarColor: true },
  });
  res.json(user);
}
