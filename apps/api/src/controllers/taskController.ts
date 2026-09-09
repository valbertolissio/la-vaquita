import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { safeUserSelect } from "../lib/selects";
import { computeDurationSeconds, nextRotationCursor } from "../lib/rotation";
import { AuthedRequest } from "../middleware/auth";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  timeTracked: z.boolean().default(false),
  assignmentType: z.enum(["MANUAL", "ROTATING"]).default("MANUAL"),
  assignedToId: z.string().uuid().optional(),
  rotationMembers: z.array(z.string().uuid()).optional(),
  rotationName: z.string().optional(),
});

const completeTaskSchema = z.object({
  durationSeconds: z.number().int().min(0).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  timeTracked: z.boolean().optional(),
  assignedToId: z.string().uuid().optional(),
  rotationMembers: z.array(z.string().uuid()).optional(),
});

export async function listTasks(req: AuthedRequest, res: Response) {
  const tasks = await prisma.task.findMany({
    where: { tripId: req.params.tripId },
    include: {
      assignedTo: { select: safeUserSelect },
      rotationGroup: true,
      completions: { orderBy: { completedAt: "desc" }, take: 5, include: { completedBy: { select: safeUserSelect } } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  res.json(tasks);
}

export async function createTask(req: AuthedRequest, res: Response) {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { rotationMembers, rotationName, assignmentType, ...data } = parsed.data;
  const tripId = req.params.tripId;

  if (data.timeTracked && !data.startDate) {
    data.startDate = new Date();
  }

  if (assignmentType === "ROTATING") {
    if (!rotationMembers || rotationMembers.length < 2) {
      return res.status(400).json({ error: "Un turno rotativo necesita al menos 2 integrantes" });
    }
    const group = await prisma.rotationGroup.create({
      data: { tripId, name: rotationName ?? data.title, memberOrder: rotationMembers, cursor: 0 },
    });
    const task = await prisma.task.create({
      data: {
        ...data,
        tripId,
        createdById: req.userId!,
        assignmentType,
        rotationGroupId: group.id,
        assignedToId: rotationMembers[0],
      },
      include: { assignedTo: { select: safeUserSelect }, rotationGroup: true },
    });
    return res.status(201).json(task);
  }

  const task = await prisma.task.create({
    data: { ...data, tripId, createdById: req.userId!, assignmentType },
    include: { assignedTo: { select: safeUserSelect } },
  });
  res.status(201).json(task);
}

export async function updateTask(req: AuthedRequest, res: Response) {
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId }, include: { rotationGroup: true } });
  if (!task) return res.status(404).json({ error: "Tarea no encontrada" });

  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { rotationMembers, ...data } = parsed.data;

  // Si se activa el cronómetro y no queda ninguna fecha de inicio (ni la nueva
  // ni la que ya tenía la tarea), arranca a contar desde ahora.
  const effectiveTimeTracked = data.timeTracked ?? task.timeTracked;
  const effectiveStartDate = data.startDate !== undefined ? data.startDate : task.startDate;
  if (effectiveTimeTracked && !effectiveStartDate) {
    data.startDate = new Date();
  }

  if (task.assignmentType === "ROTATING" && task.rotationGroupId && rotationMembers && rotationMembers.length >= 2) {
    await prisma.rotationGroup.update({
      where: { id: task.rotationGroupId },
      data: { memberOrder: rotationMembers, cursor: 0 },
    });
    (data as any).assignedToId = rotationMembers[0];
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data,
    include: { assignedTo: { select: safeUserSelect }, rotationGroup: true },
  });
  res.json(updated);
}

/**
 * Marca el turno actual como hecho. Si la tarea usa cronómetro (timeTracked),
 * calcula cuánto tardó desde startDate y lo guarda en la TaskCompletion —
 * salvo que el cliente mande `durationSeconds` a mano (carga manual de
 * horas/minutos/segundos en vez del cronómetro en vivo). Si es rotativa,
 * avanza el turno al siguiente integrante y reinicia el cronómetro para esa
 * persona (el ciclo nunca queda "DONE": siempre hay a quién le toca a
 * continuación).
 */
export async function completeTask(req: AuthedRequest, res: Response) {
  const task = await prisma.task.findUnique({
    where: { id: req.params.taskId },
    include: { rotationGroup: true },
  });
  if (!task) return res.status(404).json({ error: "Tarea no encontrada" });

  const parsed = completeTaskSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const now = new Date();
  const durationSeconds = parsed.data.durationSeconds ?? computeDurationSeconds(task.timeTracked, task.startDate, now);

  await prisma.taskCompletion.create({
    data: { taskId: task.id, completedById: req.userId!, completedAt: now, durationSeconds: durationSeconds ?? undefined },
  });

  let rotated = false;
  let nextAssignee = null as { id: string; name: string } | null;

  if (task.assignmentType === "ROTATING" && task.rotationGroup) {
    const order = task.rotationGroup.memberOrder;
    const nextCursor = nextRotationCursor(order, task.rotationGroup.cursor);
    await prisma.rotationGroup.update({
      where: { id: task.rotationGroup.id },
      data: { cursor: nextCursor },
    });
    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: "PENDING",
        assignedToId: order[nextCursor],
        startDate: task.timeTracked ? now : task.startDate,
      },
    });
    rotated = true;
    const nextUser = await prisma.user.findUnique({ where: { id: order[nextCursor] }, select: safeUserSelect });
    if (nextUser) nextAssignee = { id: nextUser.id, name: nextUser.nickname || nextUser.name };
  } else {
    await prisma.task.update({ where: { id: task.id }, data: { status: "DONE" } });
  }

  const updated = await prisma.task.findUnique({
    where: { id: task.id },
    include: { assignedTo: { select: safeUserSelect } },
  });
  res.json({ task: updated, durationSeconds, rotated, nextAssignee });
}

/**
 * Deshace el último "hecho" de una tarea manual (no rotativa): vuelve a
 * PENDING y borra el registro de finalización más reciente (junto con el
 * tiempo que sumaba a "tiempo dedicado a tareas"). Las rotativas no tienen
 * estado DONE que destildar — siempre están PENDING, esperando el turno de
 * alguien.
 */
export async function uncompleteTask(req: AuthedRequest, res: Response) {
  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) return res.status(404).json({ error: "Tarea no encontrada" });
  if (task.status !== "DONE") {
    return res.status(400).json({ error: "La tarea no está marcada como hecha" });
  }

  const lastCompletion = await prisma.taskCompletion.findFirst({
    where: { taskId: task.id },
    orderBy: { completedAt: "desc" },
  });

  await prisma.$transaction([
    ...(lastCompletion ? [prisma.taskCompletion.delete({ where: { id: lastCompletion.id } })] : []),
    prisma.task.update({ where: { id: task.id }, data: { status: "PENDING" } }),
  ]);

  const updated = await prisma.task.findUnique({
    where: { id: task.id },
    include: { assignedTo: { select: safeUserSelect } },
  });
  res.json(updated);
}

export async function deleteTask(req: AuthedRequest, res: Response) {
  await prisma.task.delete({ where: { id: req.params.taskId } });
  res.status(204).send();
}
