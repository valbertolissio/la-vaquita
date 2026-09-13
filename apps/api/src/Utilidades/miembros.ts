import { prisma } from "../Modelo/prisma";

/**
 * Devuelve los userId recibidos que NO son integrantes del viaje.
 *
 * Sirve para rechazar pedidos que mandan gente de afuera: sin esto se podría
 * dividir un gasto con alguien que no está en el proyecto, o asignarle una
 * tarea, y esa persona aparecería en los saldos sin pertenecer al grupo.
 */
export async function idsQueNoSonMiembros(tripId: string, userIds: (string | null | undefined)[]): Promise<string[]> {
  const unicos = [...new Set(userIds.filter((id): id is string => !!id))];
  if (unicos.length === 0) return [];

  const miembros = await prisma.tripMember.findMany({
    where: { tripId, userId: { in: unicos } },
    select: { userId: true },
  });

  const encontrados = new Set(miembros.map((m) => m.userId));
  return unicos.filter((id) => !encontrados.has(id));
}
