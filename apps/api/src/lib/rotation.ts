/** Avanza el turno rotativo al siguiente integrante del grupo (con wrap-around al final). */
export function nextRotationCursor(memberOrder: string[], cursor: number): number {
  return (cursor + 1) % memberOrder.length;
}

/**
 * Calcula cuánto duró una tarea, en segundos, desde que arrancó hasta que se
 * completó — tenga o no cronómetro. Si nunca se le puso fecha de inicio no
 * hay nada que medir.
 */
export function computeDurationSeconds(startDate: Date | null, completedAt: Date): number | null {
  if (!startDate) return null;
  return Math.max(0, Math.round((completedAt.getTime() - startDate.getTime()) / 1000));
}
