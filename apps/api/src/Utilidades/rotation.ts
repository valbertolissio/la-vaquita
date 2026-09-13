/** Avanza el turno rotativo al siguiente integrante del grupo (con wrap-around al final). */
export function nextRotationCursor(memberOrder: string[], cursor: number): number {
  return (cursor + 1) % memberOrder.length;
}

/**
 * Más de un día corrido no es tiempo de trabajo real: es una fecha de
 * calendario. Pasa cuando alguien programa una tarea con fecha de inicio hoy
 * y fecha de fin dentro de meses, o cuando un turno queda pendiente una
 * semana — medir de punta a punta sumaría cientos de horas a "tiempo
 * dedicado a tareas" por una tarea de diez minutos.
 */
const MAX_DURACION_SEGUNDOS = 24 * 60 * 60;

/**
 * Calcula cuánto duró una tarea, en segundos, desde que arrancó hasta que se
 * completó — tenga o no cronómetro. Devuelve null si nunca se le puso fecha
 * de inicio (no hay nada que medir) o si el lapso es tan largo que claramente
 * no es tiempo trabajado sino una fecha agendada.
 */
export function computeDurationSeconds(startDate: Date | null, completedAt: Date): number | null {
  if (!startDate) return null;
  const segundos = Math.max(0, Math.round((completedAt.getTime() - startDate.getTime()) / 1000));
  return segundos > MAX_DURACION_SEGUNDOS ? null : segundos;
}
