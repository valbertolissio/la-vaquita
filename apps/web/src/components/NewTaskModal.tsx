import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { Trip } from "../lib/types";

interface Props {
  tripId: string;
  trip: Trip;
  onClose: () => void;
  onCreated: () => void;
}

export function NewTaskModal({ tripId, trip, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignmentType, setAssignmentType] = useState<"MANUAL" | "ROTATING">("MANUAL");
  const [assignedToId, setAssignedToId] = useState(trip.members[0]?.userId ?? "");
  const [rotationMembers, setRotationMembers] = useState<string[]>(trip.members.map((m) => m.userId));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleRotationMember(userId: string) {
    setRotationMembers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleSubmit() {
    setError(null);
    if (!title) {
      setError("Ponele un título a la tarea.");
      return;
    }
    setSubmitting(true);
    try {
      await api.createTask(tripId, {
        title,
        dueDate: dueDate || undefined,
        assignmentType,
        assignedToId: assignmentType === "MANUAL" ? assignedToId : undefined,
        rotationMembers: assignmentType === "ROTATING" ? rotationMembers : undefined,
      });
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Tarea nueva</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Cocinar cena"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Fecha</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
            <button
              onClick={() => setAssignmentType("MANUAL")}
              className={`flex-1 rounded-md py-1.5 ${assignmentType === "MANUAL" ? "bg-vaquita-green text-white" : "text-slate-500"}`}
            >
              Asignación manual
            </button>
            <button
              onClick={() => setAssignmentType("ROTATING")}
              className={`flex-1 rounded-md py-1.5 ${assignmentType === "ROTATING" ? "bg-vaquita-green text-white" : "text-slate-500"}`}
            >
              Turno rotativo
            </button>
          </div>

          {assignmentType === "MANUAL" ? (
            <div>
              <label className="text-xs font-medium text-slate-500">Asignada a</label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {trip.members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-500">Integrantes del turno (en orden)</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {trip.members.map((m) => (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => toggleRotationMember(m.userId)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      rotationMembers.includes(m.userId)
                        ? "border-vaquita-green bg-vaquita-green/10 text-vaquita-greenDark"
                        : "border-slate-300 text-slate-500"
                    }`}
                  >
                    {m.user.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-vaquita-green py-2.5 text-sm font-semibold text-white hover:bg-vaquita-greenDark disabled:opacity-60"
          >
            {submitting ? "Guardando..." : "Guardar tarea"}
          </button>
        </div>
      </div>
    </div>
  );
}
