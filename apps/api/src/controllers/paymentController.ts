import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { safeUserSelect } from "../lib/selects";
import { AuthedRequest } from "../middleware/auth";

const createPaymentSchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  amount: z.number().positive(),
  note: z.string().optional(),
});

export async function listPayments(req: AuthedRequest, res: Response) {
  const payments = await prisma.payment.findMany({
    where: { tripId: req.params.tripId },
    include: { fromUser: { select: safeUserSelect }, toUser: { select: safeUserSelect } },
    orderBy: { createdAt: "desc" },
  });
  res.json(payments);
}

export async function createPayment(req: AuthedRequest, res: Response) {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { fromUserId, toUserId, amount, note } = parsed.data;
  if (fromUserId === toUserId) {
    return res.status(400).json({ error: "El pago tiene que ser entre dos integrantes distintos" });
  }

  const payment = await prisma.payment.create({
    data: { tripId: req.params.tripId, fromUserId, toUserId, amount, note },
    include: { fromUser: { select: safeUserSelect }, toUser: { select: safeUserSelect } },
  });

  res.status(201).json(payment);
}

export async function deletePayment(req: AuthedRequest, res: Response) {
  await prisma.payment.delete({ where: { id: req.params.paymentId } });
  res.status(204).send();
}
