import { useEffect, useState } from "react";
import { Text, TextStyle } from "react-native";
import { formatDuration, secondsSince } from "../lib/format";

interface LiveTimerProps {
  startDate: string;
  style?: TextStyle;
}

export function LiveTimer({ startDate, style }: LiveTimerProps) {
  const [seconds, setSeconds] = useState(() => secondsSince(startDate));

  useEffect(() => {
    const id = setInterval(() => setSeconds(secondsSince(startDate)), 30_000);
    return () => clearInterval(id);
  }, [startDate]);

  return <Text style={style}>Llevás {formatDuration(seconds)}</Text>;
}
