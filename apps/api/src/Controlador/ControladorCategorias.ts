import { Response } from "express";
import { z } from "zod";
import { prisma } from "../Modelo/baseDeDatos";
import { PedidoAutenticado } from "../Intermediarios/exigirSesion";

const createCategorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

export async function crearCategoria(req: PedidoAutenticado, res: Response) {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const existing = await prisma.categoria.findUnique({
    where: { tripId_name: { tripId: req.params.tripId, name: parsed.data.name } },
  });
  if (existing) {
    return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
  }

  const category = await prisma.categoria.create({
    data: { ...parsed.data, tripId: req.params.tripId },
  });
  res.status(201).json(category);
}

export async function actualizarCategoria(req: PedidoAutenticado, res: Response) {
  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const category = await prisma.categoria.findFirst({
    where: { id: req.params.categoryId, tripId: req.params.tripId },
  });
  if (!category) {
    return res.status(404).json({ error: "Categoría no encontrada" });
  }

  if (parsed.data.name && parsed.data.name !== category.name) {
    const existing = await prisma.categoria.findUnique({
      where: { tripId_name: { tripId: req.params.tripId, name: parsed.data.name } },
    });
    if (existing) {
      return res.status(409).json({ error: "Ya existe una categoría con ese nombre" });
    }
  }

  const updated = await prisma.categoria.update({
    where: { id: category.id },
    data: parsed.data,
  });
  res.json(updated);
}

export async function eliminarCategoria(req: PedidoAutenticado, res: Response) {
  const category = await prisma.categoria.findFirst({
    where: { id: req.params.categoryId, tripId: req.params.tripId },
  });
  if (!category) {
    return res.status(404).json({ error: "Categoría no encontrada" });
  }

  const usageCount = await prisma.gasto.count({ where: { categoryId: category.id } });
  if (usageCount > 0) {
    return res.status(409).json({ error: "No se puede eliminar una categoría que ya tiene gastos cargados" });
  }

  await prisma.categoria.delete({ where: { id: category.id } });
  res.status(204).send();
}
