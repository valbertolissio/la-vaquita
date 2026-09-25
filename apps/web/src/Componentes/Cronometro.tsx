import { useEffect, useState } from "react";
import { formatearDuracion, secondsSince } from "../Utilidades/formato";

interface LiveTimerProps {
  startDate: string;
  className?: string;
}

/** Muestra "Llevás X" y se actualiza solo cada minuto mientras la tarea está en curso. */
export function Cronometro({ startDate, className }: LiveTimerProps) {
  const [seconds, setSeconds] = useState(() => secondsSince(startDate));

  useEffect(() => {
    const id = setInterval(() => setSeconds(secondsSince(startDate)), 30_000);
    return () => clearInterval(id);
  }, [startDate]);

  return <span className={className}>Llevás {formatearDuracion(seconds)}</span>;
}
