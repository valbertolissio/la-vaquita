/** Avanza el turno rotativo al siguiente integrante del grupo (con wrap-around al final). */
export function nextRotationCursor(memberOrder: string[], cursor: number): number {
  return (cursor + 1) % memberOrder.length;
}

/**
 * Calcula cuánto duró una tarea con cronómetro, en segundos, desde que
 * arrancó hasta que se completó. Si la tarea no usa cronómetro (o nunca
 * arrancó) no hay nada que medir.
 */
export function computeDurationSeconds(timeTracked: boolean, startDate: Date | null, completedAt: Date): number | null {
  if (!timeTracked || !startDate) return null;
  return Math.max(0, Math.round((completedAt.getTime() - startDate.getTime()) / 1000));
}
