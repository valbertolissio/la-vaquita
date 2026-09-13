import { createContext, useContext, useState, ReactNode } from "react";
import { Trip } from "../lib/types";

interface TripContextValue {
  trip: Trip | null;
  setTrip: (trip: Trip | null) => void;
}

const TripContext = createContext<TripContextValue | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  return <TripContext.Provider value={{ trip, setTrip }}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip debe usarse dentro de TripProvider");
  return ctx;
}
