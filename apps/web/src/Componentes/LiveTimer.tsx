import { useEffect, useState } from "react";
import { formatDuration, secondsSince } from "../lib/format";

interface LiveTimerProps {
  startDate: string;
  className?: string;
}

/** Muestra "Llevás X" y se actualiza solo cada minuto mientras la tarea está en curso. */
export function LiveTimer({ startDate, className }: LiveTimerProps) {
  const [seconds, setSeconds] = useState(() => secondsSince(startDate));

  useEffect(() => {
    const id = setInterval(() => setSeconds(secondsSince(startDate)), 30_000);
    return () => clearInterval(id);
  }, [startDate]);

  return <span className={className}>Llevás {formatDuration(seconds)}</span>;
}
