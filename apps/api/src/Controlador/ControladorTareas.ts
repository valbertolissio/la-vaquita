import { Response } from "express";
import { z } from "zod";
import { prisma } from "../Modelo/baseDeDatos";
import { camposPublicosDelUsuario } from "../Utilidades/camposPublicos";
import { calcularDuracionEnSegundos, siguienteTurno } from "../Utilidades/turnos";
import { idsQueNoSonMiembros } from "../Utilidades/miembros";
import { PedidoAutenticado } from "../Intermediarios/exigirSesion";

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

export async function listarTareas(req: PedidoAutenticado, res: Response) {
  const tasks = await prisma.tarea.findMany({
    where: { tripId: req.params.tripId },
    include: {
      assignedTo: { select: camposPublicosDelUsuario },
      rotationGroup: true,
      completions: { orderBy: { completedAt: "desc" }, take: 5, include: { completedBy: { select: camposPublicosDelUsuario } } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  res.json(tasks);
}

export async function crearTarea(req: PedidoAutenticado, res: Response) {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { rotationMembers, rotationName, assignmentType, ...data } = parsed.data;
  const tripId = req.params.tripId;

  const ajenos = await idsQueNoSonMiembros(tripId, [data.assignedToId, ...(rotationMembers ?? [])]);
  if (ajenos.length > 0) {
    return res.status(400).json({ error: "Hay personas asignadas que no son integrantes del proyecto" });
  }

  if (data.startDate && data.dueDate && data.dueDate < data.startDate) {
    return res.status(400).json({ error: "La fecha de fin no puede ser anterior a la de inicio" });
  }

  if (data.timeTracked && !data.startDate) {
    data.startDate = new Date();
  }

  if (assignmentType === "ROTATING") {
    if (!rotationMembers || rotationMembers.length < 2) {
      return res.status(400).json({ error: "Un turno rotativo necesita al menos 2 integrantes" });
    }
    const group = await prisma.grupoDeRotacion.create({
      data: { tripId, name: rotationName ?? data.title, memberOrder: rotationMembers, cursor: 0 },
    });
    const task = await prisma.tarea.create({
      data: {
        ...data,
        tripId,
        createdById: req.userId!,
        assignmentType,
        rotationGroupId: group.id,
        assignedToId: rotationMembers[0],
      },
      include: { assignedTo: { select: camposPublicosDelUsuario }, rotationGroup: true },
    });
    return res.status(201).json(task);
  }

  const task = await prisma.tarea.create({
    data: { ...data, tripId, createdById: req.userId!, assignmentType },
    include: { assignedTo: { select: camposPublicosDelUsuario } },
  });
  res.status(201).json(task);
}

export async function actualizarTarea(req: PedidoAutenticado, res: Response) {
  // Filtrar también por tripId: ser miembro del viaje de la URL no puede
  // habilitar a tocar una tarea que pertenece a otro viaje.
  const task = await prisma.tarea.findFirst({
    where: { id: req.params.taskId, tripId: req.params.tripId },
    include: { rotationGroup: true },
  });
  if (!task) return res.status(404).json({ error: "Tarea no encontrada" });

  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { rotationMembers, ...data } = parsed.data;

  const ajenos = await idsQueNoSonMiembros(req.params.tripId, [data.assignedToId, ...(rotationMembers ?? [])]);
  if (ajenos.length > 0) {
    return res.status(400).json({ error: "Hay personas asignadas que no son integrantes del proyecto" });
  }

  // Si se activa el cronómetro y no queda ninguna fecha de inicio (ni la nueva
  // ni la que ya tenía la tarea), arranca a contar desde ahora.
  const effectiveTimeTracked = data.timeTracked ?? task.timeTracked;
  const effectiveStartDate = data.startDate !== undefined ? data.startDate : task.startDate;
  if (effectiveTimeTracked && !effectiveStartDate) {
    data.startDate = new Date();
  }

  const effectiveDueDate = data.dueDate !== undefined ? data.dueDate : task.dueDate;
  if (effectiveStartDate && effectiveDueDate && effectiveDueDate < effectiveStartDate) {
    return res.status(400).json({ error: "La fecha de fin no puede ser anterior a la de inicio" });
  }

  if (task.assignmentType === "ROTATING" && task.rotationGroupId && rotationMembers && rotationMembers.length >= 2) {
    await prisma.grupoDeRotacion.update({
      where: { id: task.rotationGroupId },
      data: { memberOrder: rotationMembers, cursor: 0 },
    });
    (data as any).assignedToId = rotationMembers[0];
  }

  const updated = await prisma.tarea.update({
    where: { id: task.id },
    data,
    include: { assignedTo: { select: camposPublicosDelUsuario }, rotationGroup: true },
  });
  res.json(updated);
}

/**
 * Marca el turno actual como hecho. Si la tarea tiene startDate (con
 * cronómetro o con fecha manual, da igual), calcula cuánto tardó y lo guarda
 * en la TaskCompletion — salvo que el cliente mande `durationSeconds` a mano
 * (carga manual de horas/minutos/segundos en vez de aceptar el tiempo
 * calculado). Si es rotativa, avanza el turno al siguiente integrante y
 * reinicia el cronómetro para esa persona (el ciclo nunca queda "DONE":
 * siempre hay a quién le toca a continuación).
 */
export async function completarTarea(req: PedidoAutenticado, res: Response) {
  const task = await prisma.tarea.findFirst({
    where: { id: req.params.taskId, tripId: req.params.tripId },
    include: { rotationGroup: true },
  });
  if (!task) return res.status(404).json({ error: "Tarea no encontrada" });

  const parsed = completeTaskSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const now = new Date();
  const durationSeconds = parsed.data.durationSeconds ?? calcularDuracionEnSegundos(task.startDate, now);

  await prisma.tareaCompletada.create({
    data: { taskId: task.id, completedById: req.userId!, completedAt: now, durationSeconds: durationSeconds ?? undefined },
  });

  let rotated = false;
  let nextAssignee = null as { id: string; name: string } | null;

  if (task.assignmentType === "ROTATING" && task.rotationGroup) {
    const order = task.rotationGroup.memberOrder;
    const nextCursor = siguienteTurno(order, task.rotationGroup.cursor);
    await prisma.grupoDeRotacion.update({
      where: { id: task.rotationGroup.id },
      data: { cursor: nextCursor },
    });
    await prisma.tarea.update({
      where: { id: task.id },
      data: {
        status: "PENDING",
        assignedToId: order[nextCursor],
        // El reloj del turno arranca de cero para quien recibe la posta, use
        // cronómetro o fechas manuales. Antes, en una tarea con fechas
        // manuales la fecha de inicio no se tocaba nunca, así que cada turno
        // se medía desde que se creó la tarea y el tiempo dedicado crecía
        // turno a turno sin tener nada que ver con lo que realmente llevó.
        startDate: now,
      },
    });
    rotated = true;
    const nextUser = await prisma.usuario.findUnique({ where: { id: order[nextCursor] }, select: camposPublicosDelUsuario });
    if (nextUser) nextAssignee = { id: nextUser.id, name: nextUser.nickname || nextUser.name };
  } else {
    await prisma.tarea.update({ where: { id: task.id }, data: { status: "DONE" } });
  }

  const updated = await prisma.tarea.findUnique({
    where: { id: task.id },
    include: { assignedTo: { select: camposPublicosDelUsuario } },
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
export async function descompletarTarea(req: PedidoAutenticado, res: Response) {
  const task = await prisma.tarea.findFirst({ where: { id: req.params.taskId, tripId: req.params.tripId } });
  if (!task) return res.status(404).json({ error: "Tarea no encontrada" });
  if (task.status !== "DONE") {
    return res.status(400).json({ error: "La tarea no está marcada como hecha" });
  }

  const lastCompletion = await prisma.tareaCompletada.findFirst({
    where: { taskId: task.id },
    orderBy: { completedAt: "desc" },
  });

  await prisma.$transaction([
    ...(lastCompletion ? [prisma.tareaCompletada.delete({ where: { id: lastCompletion.id } })] : []),
    prisma.tarea.update({ where: { id: task.id }, data: { status: "PENDING" } }),
  ]);

  const updated = await prisma.tarea.findUnique({
    where: { id: task.id },
    include: { assignedTo: { select: camposPublicosDelUsuario } },
  });
  res.json(updated);
}

export async function eliminarTarea(req: PedidoAutenticado, res: Response) {
  const task = await prisma.tarea.findFirst({
    where: { id: req.params.taskId, tripId: req.params.tripId },
    select: { id: true },
  });
  if (!task) return res.status(404).json({ error: "Tarea no encontrada" });

  await prisma.tarea.delete({ where: { id: task.id } });
  res.status(204).send();
}
