import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  assignmentType: z.enum(["MANUAL", "ROTATING"]).default("MANUAL"),
  assignedToId: z.string().uuid().optional(),
  rotationMembers: z.array(z.string().uuid()).optional(),
  rotationName: z.string().optional(),
});

export async function listTasks(req: AuthedRequest, res: Response) {
  const tasks = await prisma.task.findMany({
    where: { tripId: req.params.tripId },
    include: { assignedTo: true, rotationGroup: true },
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
      include: { assignedTo: true, rotationGroup: true },
    });
    return res.status(201).json(task);
  }

  const task = await prisma.task.create({
    data: { ...data, tripId, createdById: req.userId!, assignmentType },
    include: { assignedTo: true },
  });
  res.status(201).json(task);
}

/** Marca la tarea como hecha y, si es rotativa, avanza el turno al siguiente integrante. */
export async function completeTask(req: AuthedRequest, res: Response) {
  const task = await prisma.task.findUnique({
    where: { id: req.params.taskId },
    include: { rotationGroup: true },
  });
  if (!task) return res.status(404).json({ error: "Tarea no encontrada" });

  await prisma.taskCompletion.create({
    data: { taskId: task.id, completedById: req.userId! },
  });

  if (task.assignmentType === "ROTATING" && task.rotationGroup) {
    const order = task.rotationGroup.memberOrder;
    const nextCursor = (task.rotationGroup.cursor + 1) % order.length;
    await prisma.rotationGroup.update({
      where: { id: task.rotationGroup.id },
      data: { cursor: nextCursor },
    });
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "PENDING", assignedToId: order[nextCursor] },
    });
  } else {
    await prisma.task.update({ where: { id: task.id }, data: { status: "DONE" } });
  }

  const updated = await prisma.task.findUnique({
    where: { id: task.id },
    include: { assignedTo: true },
  });
  res.json(updated);
}

export async function deleteTask(req: AuthedRequest, res: Response) {
  await prisma.task.delete({ where: { id: req.params.taskId } });
  res.status(204).send();
}
