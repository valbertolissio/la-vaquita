import { NextFunction, Response } from "express";
import { prisma } from "../Modelo/baseDeDatos";
import { PedidoAutenticado } from "./exigirSesion";

export async function exigirMiembro(req: PedidoAutenticado, res: Response, next: NextFunction) {
  const tripId = req.params.tripId;
  const membership = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: req.userId! } },
  });

  if (!membership) {
    return res.status(403).json({ error: "No pertenecés a este viaje" });
  }

  next();
}
