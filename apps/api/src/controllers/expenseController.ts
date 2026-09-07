import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
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

function buildEqualSplits(totalAmount: number, userIds: string[]) {
  const base = Math.floor((totalAmount / userIds.length) * 100) / 100;
  const splits = userIds.map((userId) => ({ userId, amountOwed: base }));
  // Ajuste de centavos de redondeo: el resto se lo lleva el primer integrante.
  const assigned = base * userIds.length;
  const remainder = Math.round((totalAmount - assigned) * 100) / 100;
  splits[0].amountOwed = Math.round((splits[0].amountOwed + remainder) * 100) / 100;
  return splits;
}

export async function listExpenses(req: AuthedRequest, res: Response) {
  const expenses = await prisma.expense.findMany({
    where: { tripId: req.params.tripId },
    include: { paidBy: true, category: true, splits: { include: { user: true } } },
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
    include: { splits: true, paidBy: true, category: true },
  });

  res.status(201).json(expense);
}

export async function deleteExpense(req: AuthedRequest, res: Response) {
  await prisma.expense.delete({ where: { id: req.params.expenseId } });
  res.status(204).send();
}

/**
 * Recibe una imagen de comprobante y devuelve campos pre-completados
 * (monto, comercio, fecha) para que el usuario los confirme antes de guardar.
 * El motor OCR real (ej. Tesseract.js / Google Vision) se conecta acá.
 */
export async function scanReceipt(req: AuthedRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "No se recibió ninguna imagen" });
  }

  // TODO: integrar un proveedor OCR real. Placeholder para no bloquear el resto del flujo.
  res.json({
    description: "",
    amount: null,
    merchant: null,
    expenseDate: new Date().toISOString(),
    receiptUrl: `/uploads/${req.file.filename}`,
    confidence: 0,
  });
}
