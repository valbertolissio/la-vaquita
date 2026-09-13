import { Response } from "express";
import { z } from "zod";
import { prisma } from "../Modelo/baseDeDatos";
import { camposPublicosDelUsuario } from "../Utilidades/camposPublicos";
import { PedidoAutenticado } from "../Intermediarios/exigirSesion";
import { idsQueNoSonMiembros } from "../Utilidades/miembros";

const createPaymentSchema = z.object({
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  amount: z.number().positive(),
  note: z.string().optional(),
});

export async function listarPagos(req: PedidoAutenticado, res: Response) {
  const payments = await prisma.payment.findMany({
    where: { tripId: req.params.tripId },
    include: { fromUser: { select: camposPublicosDelUsuario }, toUser: { select: camposPublicosDelUsuario } },
    orderBy: { createdAt: "desc" },
  });
  res.json(payments);
}

export async function crearPago(req: PedidoAutenticado, res: Response) {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { fromUserId, toUserId, amount, note } = parsed.data;
  if (fromUserId === toUserId) {
    return res.status(400).json({ error: "El pago tiene que ser entre dos integrantes distintos" });
  }
  if (req.userId !== fromUserId && req.userId !== toUserId) {
    return res.status(403).json({ error: "Solo quien paga o quien recibe puede marcar esta deuda como pagada" });
  }

  const ajenos = await idsQueNoSonMiembros(req.params.tripId, [fromUserId, toUserId]);
  if (ajenos.length > 0) {
    return res.status(400).json({ error: "El pago tiene que ser entre integrantes del proyecto" });
  }

  const payment = await prisma.payment.create({
    data: { tripId: req.params.tripId, fromUserId, toUserId, amount, note },
    include: { fromUser: { select: camposPublicosDelUsuario }, toUser: { select: camposPublicosDelUsuario } },
  });

  res.status(201).json(payment);
}

export async function eliminarPago(req: PedidoAutenticado, res: Response) {
  const payment = await prisma.payment.findFirst({ where: { id: req.params.paymentId, tripId: req.params.tripId } });
  if (!payment) return res.status(404).json({ error: "Pago no encontrado" });
  if (req.userId !== payment.fromUserId && req.userId !== payment.toUserId) {
    return res.status(403).json({ error: "Solo quien pagó o quien recibió puede deshacer este pago" });
  }

  await prisma.payment.delete({ where: { id: req.params.paymentId } });
  res.status(204).send();
}
