import { Response } from "express";
import { z } from "zod";
import { createWorker } from "tesseract.js";
import { prisma } from "../lib/prisma";
import { safeUserSelect } from "../lib/selects";
import { buildEqualSplits } from "../lib/splits";
import { parseReceiptText } from "../lib/receiptParser";
import { AuthedRequest } from "../middleware/auth";

const createExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  categoryId: z.string().uuid().optional(),
  paidById: z.string().uuid(),
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
  paidById: z.string().uuid().optional(),
  splitBetween: z.array(z.string().uuid()).min(1).optional(),
  notes: z.string().optional(),
  expenseDate: z.coerce.date().optional(),
});

export async function listExpenses(req: AuthedRequest, res: Response) {
  const expenses = await prisma.expense.findMany({
    where: { tripId: req.params.tripId },
    include: { paidBy: { select: safeUserSelect }, category: true, splits: { include: { user: { select: safeUserSelect } } } },
    orderBy: { expenseDate: "desc" },
  });
  res.json(expenses);
}

export async function createExpense(req: AuthedRequest, res: Response) {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { splitBetween, ...data } = parsed.data;
  const splits = buildEqualSplits(data.amount, splitBetween);

  const expense = await prisma.expense.create({
    data: {
      ...data,
      tripId: req.params.tripId,
      createdById: req.userId!,
      splits: { create: splits },
    },
    include: { splits: true, paidBy: { select: safeUserSelect }, category: true },
  });

  res.status(201).json(expense);
}

export async function updateExpense(req: AuthedRequest, res: Response) {
  const expense = await prisma.expense.findUnique({ where: { id: req.params.expenseId }, include: { splits: true } });
  if (!expense) return res.status(404).json({ error: "Gasto no encontrado" });

  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { splitBetween, ...data } = parsed.data;

  const finalAmount = data.amount ?? Number(expense.amount);
  const needsResplit = splitBetween !== undefined || data.amount !== undefined;

  const updated = await prisma.$transaction(async (tx) => {
    if (needsResplit) {
      const memberIds = splitBetween ?? expense.splits.map((s) => s.userId);
      await tx.expenseSplit.deleteMany({ where: { expenseId: expense.id } });
      await tx.expenseSplit.createMany({
        data: buildEqualSplits(finalAmount, memberIds).map((s) => ({ ...s, expenseId: expense.id })),
      });
    }
    return tx.expense.update({
      where: { id: expense.id },
      data,
      include: { splits: { include: { user: { select: safeUserSelect } } }, paidBy: { select: safeUserSelect }, category: true },
    });
  });

  res.json(updated);
}

export async function deleteExpense(req: AuthedRequest, res: Response) {
  await prisma.expense.delete({ where: { id: req.params.expenseId } });
  res.status(204).send();
}

/**
 * Recibe una imagen de comprobante, la pasa por OCR (Tesseract.js) y devuelve
 * campos pre-completados (monto, comercio, fecha) para que el usuario los
 * confirme antes de guardar. Las heurísticas de lectura del ticket viven en
 * lib/receiptParser.ts — esto es una ayuda para no tipear todo a mano, no un
 * reemplazo de la revisión manual.
 */
export async function scanReceipt(req: AuthedRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "No se recibió ninguna imagen" });
  }

  const receiptUrl = `/uploads/${req.file.filename}`;

  let text = "";
  let confidence = 0;
  try {
    const worker = await createWorker("spa");
    try {
      const result = await worker.recognize(req.file.path);
      text = result.data.text;
      confidence = Math.round(result.data.confidence) / 100;
    } finally {
      await worker.terminate();
    }
  } catch (err) {
    console.error("[scanReceipt] falló el OCR:", err);
  }

  const parsed = parseReceiptText(text);

  res.json({
    description: parsed.merchant ?? "",
    amount: parsed.amount,
    merchant: parsed.merchant,
    expenseDate: parsed.expenseDate ?? new Date().toISOString(),
    receiptUrl,
    confidence,
  });
}
