import { useEffect, useState } from "react";
import { Text, TextStyle } from "react-native";
import { formatearDuracion, secondsSince } from "../Utilidades/formato";

interface LiveTimerProps {
  startDate: string;
  style?: TextStyle;
}

export function Cronometro({ startDate, style }: LiveTimerProps) {
  const [seconds, setSeconds] = useState(() => secondsSince(startDate));

  useEffect(() => {
    const id = setInterval(() => setSeconds(secondsSince(startDate)), 30_000);
    return () => clearInterval(id);
  }, [startDate]);

  return <Text style={style}>Llevás {formatearDuracion(seconds)}</Text>;
}
