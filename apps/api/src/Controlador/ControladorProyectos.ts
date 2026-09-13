import { Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../Modelo/baseDeDatos";
import { camposPublicosDelUsuario } from "../Utilidades/camposPublicos";
import { PedidoAutenticado } from "../Intermediarios/exigirSesion";
import { calcularSaldos, simplificarDeudas } from "../Utilidades/saldos";
import { enviarCorreoDeInvitacion } from "../Utilidades/correo";

const DEFAULT_CATEGORIES = [
  { name: "Alimentación", icon: "utensils", color: "#22a559" },
  { name: "Transporte", icon: "car", color: "#3b82f6" },
  { name: "Alojamiento", icon: "home", color: "#a855f7" },
  { name: "Ocio", icon: "sparkles", color: "#f97316" },
  { name: "Otros", icon: "dots", color: "#ef4444" },
];

const createTripSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  coverImage: z.string().url().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  currency: z.string().default("ARS"),
}).refine((d) => d.endDate >= d.startDate, {
  message: "La fecha de fin no puede ser anterior a la de inicio",
  path: ["endDate"],
});

const updateTripSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  currency: z.string().optional(),
});

async function esOrganizador(tripId: string, userId: string) {
  const membership = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } },
  });
  return membership?.role === "ORGANIZER";
}

export async function listarProyectos(req: PedidoAutenticado, res: Response) {
  const trips = await prisma.trip.findMany({
    where: { members: { some: { userId: req.userId } } },
    include: { members: true },
    orderBy: { startDate: "desc" },
  });
  res.json(trips);
}

export async function crearProyecto(req: PedidoAutenticado, res: Response) {
  const parsed = createTripSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const trip = await prisma.trip.create({
    data: {
      ...parsed.data,
      createdById: req.userId!,
      members: { create: { userId: req.userId!, role: "ORGANIZER" } },
      categories: { create: DEFAULT_CATEGORIES },
    },
    include: { members: { include: { user: { select: camposPublicosDelUsuario } } }, categories: true },
  });

  res.status(201).json(trip);
}

export async function obtenerProyecto(req: PedidoAutenticado, res: Response) {
  const trip = await prisma.trip.findUnique({
    where: { id: req.params.tripId },
    include: {
      members: { include: { user: { select: camposPublicosDelUsuario } } },
      categories: true,
    },
  });
  if (!trip) return res.status(404).json({ error: "Viaje no encontrado" });
  res.json(trip);
}

/** Panel "Resumen": lo que arma el dashboard de la web/app. */
export async function obtenerResumenDelProyecto(req: PedidoAutenticado, res: Response) {
  const tripId = req.params.tripId;

  const [expenses, pendingTasks, balances, timeCompletions, paidToMeAgg] = await Promise.all([
    prisma.expense.findMany({
      where: { tripId },
      include: { payers: { include: { user: { select: camposPublicosDelUsuario } } }, category: true },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "asc" }],
    }),
    prisma.task.findMany({
      where: { tripId, status: "PENDING" },
      include: { assignedTo: { select: camposPublicosDelUsuario } },
      orderBy: { dueDate: "asc" },
    }),
    calcularSaldos(tripId),
    prisma.taskCompletion.findMany({
      where: { task: { tripId }, durationSeconds: { not: null } },
      include: { completedBy: { select: camposPublicosDelUsuario } },
    }),
    // Pagos que otros integrantes ya le hicieron a este usuario para saldar deuda.
    prisma.payment.aggregate({
      where: { tripId, toUserId: req.userId },
      _sum: { amount: true },
    }),
  ]);

  const timeByUser = new Map<string, { userId: string; name: string; avatarColor: string | null; totalSeconds: number; taskCount: number }>();
  for (const c of timeCompletions) {
    const entry = timeByUser.get(c.completedById) ?? {
      userId: c.completedById,
      name: c.completedBy.nickname || c.completedBy.name,
      avatarColor: c.completedBy.avatarColor,
      totalSeconds: 0,
      taskCount: 0,
    };
    entry.totalSeconds += c.durationSeconds ?? 0;
    entry.taskCount += 1;
    timeByUser.set(c.completedById, entry);
  }
  const timeByParticipant = Array.from(timeByUser.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const myBalance = balances.find((b) => b.userId === req.userId)?.balance ?? 0;
  const pendingTotal = balances.filter((b) => b.balance < 0).reduce((s, b) => s + Math.abs(b.balance), 0);

  // Cuánto puso el usuario en gastos vs. cuánto pusieron los demás, y cuánto
  // le pagaron ya (por fuera de los gastos) para saldar su deuda.
  const myContribution = balances.find((b) => b.userId === req.userId)?.paid ?? 0;
  const othersContribution = balances.filter((b) => b.userId !== req.userId).reduce((s, b) => s + b.paid, 0);
  const paidToMe = Number(paidToMeAgg._sum.amount ?? 0);

  const byCategory = new Map<string, { name: string; color: string | null; total: number }>();
  for (const e of expenses) {
    const key = e.category?.id ?? "sin-categoria";
    const entry = byCategory.get(key) ?? {
      name: e.category?.name ?? "Otros",
      color: e.category?.color ?? "#94a3b8",
      total: 0,
    };
    entry.total += Number(e.amount);
    byCategory.set(key, entry);
  }

  res.json({
    totalExpense: Math.round(totalExpense * 100) / 100,
    expenseCount: expenses.length,
    myBalance,
    myContribution: Math.round(myContribution * 100) / 100,
    othersContribution: Math.round(othersContribution * 100) / 100,
    paidToMe: Math.round(paidToMe * 100) / 100,
    pendingTotal: Math.round(pendingTotal * 100) / 100,
    pendingTaskCount: pendingTasks.length,
    balances,
    settlements: simplificarDeudas(balances),
    recentExpenses: expenses.slice(0, 6),
    pendingTasks: pendingTasks.slice(0, 6),
    expensesByCategory: Array.from(byCategory.values()),
    timeByParticipant,
  });
}

export async function actualizarProyecto(req: PedidoAutenticado, res: Response) {
  const tripId = req.params.tripId;
  if (!(await esOrganizador(tripId, req.userId!))) {
    return res.status(403).json({ error: "Solo el organizador puede editar el viaje" });
  }

  const parsed = updateTripSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  // Las fechas vienen sueltas: hay que validar contra las que el viaje ya
  // tiene, no solo entre sí, porque se puede editar una sola de las dos.
  const actual = await prisma.trip.findUnique({ where: { id: tripId }, select: { startDate: true, endDate: true } });
  if (!actual) return res.status(404).json({ error: "Viaje no encontrado" });
  const inicio = parsed.data.startDate ?? actual.startDate;
  const fin = parsed.data.endDate ?? actual.endDate;
  if (fin < inicio) {
    return res.status(400).json({ error: "La fecha de fin no puede ser anterior a la de inicio" });
  }

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: parsed.data,
    include: {
      members: { include: { user: { select: camposPublicosDelUsuario } } },
      categories: true,
    },
  });

  res.json(trip);
}

export async function eliminarProyecto(req: PedidoAutenticado, res: Response) {
  const tripId = req.params.tripId;
  if (!(await esOrganizador(tripId, req.userId!))) {
    return res.status(403).json({ error: "Solo el organizador puede eliminar el viaje" });
  }

  // Borrar el viaje borra en cascada gastos, divisiones y pagos: si alguien
  // todavía debe o le deben plata, esa deuda desaparecería sin dejar rastro.
  // Por eso primero tienen que estar todas las cuentas saldadas.
  const balances = await calcularSaldos(tripId);
  const unsettled = balances.filter((b) => Math.abs(b.balance) > 0.01);
  if (unsettled.length > 0) {
    const names = unsettled.map((b) => b.name).join(", ");
    return res.status(409).json({
      error: `No se puede eliminar el proyecto con cuentas sin saldar (${names}). Salden las deudas pendientes primero.`,
    });
  }

  await prisma.trip.delete({ where: { id: tripId } });
  res.status(204).send();
}

// El email es opcional: sin él se genera igual un link para compartir por
// WhatsApp/Instagram/lo que sea, sin tener que tipear el correo de nadie de
// antemano. Si se manda un email, además se intenta avisar por esa vía.
export async function invitarParticipante(req: PedidoAutenticado, res: Response) {
  const schema = z.object({ email: z.string().email().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Email inválido" });

  const token = crypto.randomBytes(24).toString("hex");
  const [invitation, trip, inviter] = await Promise.all([
    prisma.invitation.create({
      data: {
        tripId: req.params.tripId,
        email: parsed.data.email,
        token,
        invitedById: req.userId!,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.trip.findUnique({ where: { id: req.params.tripId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: req.userId! }, select: { name: true, nickname: true } }),
  ]);

  const webUrl = process.env.WEB_URL ?? "http://localhost:5173";
  let emailSent = false;
  if (parsed.data.email) {
    try {
      emailSent = await enviarCorreoDeInvitacion({
        to: parsed.data.email,
        tripName: trip?.name ?? "un proyecto",
        inviterName: inviter?.nickname || inviter?.name || "Alguien",
        link: `${webUrl}/invite/${token}`,
      });
    } catch (err) {
      console.error("[invitarParticipante] no se pudo mandar el email de invitación:", err);
    }
  }

  res.status(201).json({ ...invitation, emailSent });
}

export async function aceptarInvitacion(req: PedidoAutenticado, res: Response) {
  const { token } = req.params;
  const invitation = await prisma.invitation.findUnique({ where: { token } });

  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return res.status(400).json({ error: "Invitación inválida o expirada" });
  }

  try {
    await prisma.$transaction([
      prisma.tripMember.upsert({
        where: { tripId_userId: { tripId: invitation.tripId, userId: req.userId! } },
        update: {},
        create: { tripId: invitation.tripId, userId: req.userId! },
      }),
      prisma.invitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } }),
    ]);
  } catch (err: any) {
    // Aceptar la misma invitación dos veces casi al mismo tiempo (doble tap,
    // dos pestañas) puede hacer que el upsert choque contra la restricción
    // única en vez de resolver como update. El resultado que importa (ser
    // miembro del viaje) ya está logrado, así que no es un error real.
    if (err.code !== "P2002") throw err;
  }

  res.json({ tripId: invitation.tripId });
}
