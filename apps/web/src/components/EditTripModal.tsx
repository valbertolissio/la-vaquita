import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { Trip } from "../lib/types";

interface Props {
  trip: Trip;
  onClose: () => void;
  onUpdated: (trip: Trip) => void;
}

export function EditTripModal({ trip, onClose, onUpdated }: Props) {
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(trip.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState(trip.endDate.slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!name || !startDate || !endDate) {
      setError("Completá todos los campos.");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await api.updateTrip(trip.id, { name, startDate, endDate });
      onUpdated(updated);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Editar viaje</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500">Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500">Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-vaquita-green py-2.5 text-sm font-semibold text-white hover:bg-vaquita-greenDark disabled:opacity-60"
          >
            {submitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
