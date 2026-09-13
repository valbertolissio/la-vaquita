import { createContext, useContext, useState, ReactNode } from "react";
import { Proyecto } from "../Utilidades/tipos";

interface TripContextValue {
  trip: Proyecto | null;
  setTrip: (trip: Proyecto | null) => void;
}

const TripContext = createContext<TripContextValue | undefined>(undefined);

export function ProveedorDeProyecto({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<Proyecto | null>(null);
  return <TripContext.Provider value={{ trip, setTrip }}>{children}</TripContext.Provider>;
}

export function useProyecto() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useProyecto debe usarse dentro de ProveedorDeProyecto");
  return ctx;
}
