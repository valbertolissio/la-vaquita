import { Response } from "express";
import { z } from "zod";
import { createWorker } from "tesseract.js";
import sharp from "sharp";
import { prisma } from "../Modelo/baseDeDatos";
import { camposPublicosDelUsuario } from "../Utilidades/camposPublicos";
import { dividirEnPartesIguales } from "../Utilidades/divisiones";
import { validarSumaDePagadores } from "../Utilidades/pagadores";
import { idsQueNoSonMiembros } from "../Utilidades/miembros";
import { leerComprobante } from "../Utilidades/lectorDeComprobantes";
import { PedidoAutenticado } from "../Intermediarios/exigirSesion";

const payerSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
});

const createExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  categoryId: z.string().uuid().optional(),
  payers: z.array(payerSchema).min(1, "Elegí quién pagó"),
  splitBetween: z.array(z.string().uuid()).min(1, "Elegí entre quiénes se divide el gasto"),
  source: z.enum(["MANUAL", "OCR"]).default("MANUAL"),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
  expenseDate: z.coerce.date().optional(),
});

const updateExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  payers: z.array(payerSchema).min(1).optional(),
  splitBetween: z.array(z.string().uuid()).min(1).optional(),
  notes: z.string().optional(),
  expenseDate: z.coerce.date().optional(),
});

const expenseInclude = {
  splits: { include: { user: { select: camposPublicosDelUsuario } } },
  payers: { include: { user: { select: camposPublicosDelUsuario } } },
  category: true,
} as const;

export async function listarGastos(req: PedidoAutenticado, res: Response) {
  const expenses = await prisma.gasto.findMany({
    where: { tripId: req.params.tripId },
    include: expenseInclude,
    // Cuando varios gastos comparten exactamente la misma fecha (ej. varios
    // ítems de un mismo comprobante escaneado), el creado primero se muestra
    // primero entre ellos, en vez de un orden arbitrario.
    orderBy: [{ expenseDate: "desc" }, { createdAt: "asc" }],
  });
  res.json(expenses);
}

export async function crearGasto(req: PedidoAutenticado, res: Response) {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { splitBetween, payers, ...data } = parsed.data;

  const sumError = validarSumaDePagadores(data.amount, payers);
  if (sumError) return res.status(400).json({ error: sumError });

  const ajenos = await idsQueNoSonMiembros(req.params.tripId, [...payers.map((p) => p.userId), ...splitBetween]);
  if (ajenos.length > 0) {
    return res.status(400).json({ error: "Hay participantes del gasto que no son integrantes del proyecto" });
  }

  const splits = dividirEnPartesIguales(data.amount, splitBetween);

  const expense = await prisma.gasto.create({
    data: {
      ...data,
      tripId: req.params.tripId,
      createdById: req.userId!,
      splits: { create: splits },
      payers: { create: payers },
    },
    include: expenseInclude,
  });

  res.status(201).json(expense);
}

export async function actualizarGasto(req: PedidoAutenticado, res: Response) {
  // Filtrar también por tripId: ser miembro del viaje de la URL no puede
  // habilitar a tocar un gasto que pertenece a otro viaje.
  const expense = await prisma.gasto.findFirst({
    where: { id: req.params.expenseId, tripId: req.params.tripId },
    include: { splits: true, payers: true },
  });
  if (!expense) return res.status(404).json({ error: "Gasto no encontrado" });

  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { splitBetween, payers, ...data } = parsed.data;

  const finalAmount = data.amount ?? Number(expense.amount);
  const needsResplit = splitBetween !== undefined || data.amount !== undefined;
  const needsRepayers = payers !== undefined || data.amount !== undefined;

  let finalPayers = payers;
  if (needsRepayers && !finalPayers) {
    if (expense.payers.length === 1) {
      finalPayers = [{ userId: expense.payers[0].userId, amount: finalAmount }];
    } else {
      return res.status(400).json({ error: "Especificá quién pagó cada parte del nuevo monto" });
    }
  }
  if (finalPayers) {
    const sumError = validarSumaDePagadores(finalAmount, finalPayers);
    if (sumError) return res.status(400).json({ error: sumError });
  }

  const ajenos = await idsQueNoSonMiembros(req.params.tripId, [
    ...(finalPayers?.map((p) => p.userId) ?? []),
    ...(splitBetween ?? []),
  ]);
  if (ajenos.length > 0) {
    return res.status(400).json({ error: "Hay participantes del gasto que no son integrantes del proyecto" });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (needsResplit) {
      const memberIds = splitBetween ?? expense.splits.map((s) => s.userId);
      await tx.divisionDelGasto.deleteMany({ where: { expenseId: expense.id } });
      await tx.divisionDelGasto.createMany({
        data: dividirEnPartesIguales(finalAmount, memberIds).map((s) => ({ ...s, expenseId: expense.id })),
      });
    }
    if (finalPayers) {
      await tx.pagadorDelGasto.deleteMany({ where: { expenseId: expense.id } });
      await tx.pagadorDelGasto.createMany({
        data: finalPayers.map((p) => ({ ...p, expenseId: expense.id })),
      });
    }
    return tx.gasto.update({
      where: { id: expense.id },
      data,
      include: expenseInclude,
    });
  });

  res.json(updated);
}

export async function eliminarGasto(req: PedidoAutenticado, res: Response) {
  const expense = await prisma.gasto.findFirst({
    where: { id: req.params.expenseId, tripId: req.params.tripId },
    select: { id: true },
  });
  if (!expense) return res.status(404).json({ error: "Gasto no encontrado" });

  await prisma.gasto.delete({ where: { id: expense.id } });
  res.status(204).send();
}

/**
 * Recibe una imagen de comprobante, la pasa por OCR (Tesseract.js) y devuelve
 * campos pre-completados (monto, comercio, fecha) para que el usuario los
 * confirme antes de guardar. Las heurísticas de lectura del ticket viven en
 * lib/receiptParser.ts — esto es una ayuda para no tipear todo a mano, no un
 * reemplazo de la revisión manual.
 */
export async function escanearComprobante(req: PedidoAutenticado, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "No se recibió ninguna imagen" });
  }

  const receiptUrl = `/uploads/${req.file.filename}`;

  let confidence = 0;
  let text = "";

  try {
    // Escala de grises y contraste ayudan a Tesseract con fotos reales (poca
    // luz, ángulo). Un threshold fijo (blanco/negro puro) se probó y resultó
    // CONTRAPRODUCENTE: en fotos con luz pareja lo pierde todo, porque compite
    // con la binarización adaptativa que Tesseract ya hace internamente, así
    // que conviene dejarle esa parte a él.
    const preprocessed = await sharp(req.file.path)
      .rotate()
      .grayscale()
      .resize({ width: 2400, withoutEnlargement: false })
      .normalize()
      .toBuffer();

    const worker = await createWorker("spa");
    try {
      const result = await worker.recognize(preprocessed);
      text = result.data.text;
      confidence = Math.round(result.data.confidence) / 100;
    } finally {
      await worker.terminate();
    }
  } catch (err) {
    console.error("[escanearComprobante] falló el OCR:", err);
  }

  const parsed = leerComprobante(text);

  // Si no salió ni un monto ni un ítem, la lectura no sirvió (foto borrosa,
  // manuscrita, con mucho fondo). En ese caso no devolvemos el "comercio",
  // porque con OCR malo es texto basura y el usuario termina teniendo que
  // borrarlo a mano del formulario.
  const lecturaConfiable = parsed.amount !== null || parsed.items.length > 0;

  res.json({
    description: lecturaConfiable ? parsed.merchant ?? "" : "",
    amount: parsed.amount,
    merchant: lecturaConfiable ? parsed.merchant : null,
    expenseDate: parsed.expenseDate ?? new Date().toISOString(),
    receiptUrl,
    confidence,
    items: parsed.items,
    // Le avisa al formulario si `amount` es el total impreso en el ticket o
    // apenas el número más grande que se pudo leer. Sin esto, el formulario
    // comparaba la suma de los ítems contra un número que no era un total y
    // mostraba un aviso de "no coincide" que no quería decir nada.
    totalConfiable: parsed.totalConfiable,
  });
}
