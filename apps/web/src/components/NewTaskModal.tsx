import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { Task, Trip } from "../lib/types";
import { displayName } from "../lib/format";

interface Props {
  tripId: string;
  trip: Trip;
  task?: Task;
  onClose: () => void;
  onCreated: () => void;
}

function toDateInputValue(iso: string | null) {
  return iso ? iso.slice(0, 16) : "";
}

export function NewTaskModal({ tripId, trip, task, onClose, onCreated }: Props) {
  const isEditing = !!task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [scheduleMode, setScheduleMode] = useState<"MANUAL" | "TIMER">(task?.timeTracked ? "TIMER" : "MANUAL");
  const [startDate, setStartDate] = useState(toDateInputValue(task?.startDate ?? null));
  const [dueDate, setDueDate] = useState(toDateInputValue(task?.dueDate ?? null));
  const [assignmentType, setAssignmentType] = useState<"MANUAL" | "ROTATING">(task?.assignmentType ?? "MANUAL");
  const [assignedToId, setAssignedToId] = useState(task?.assignedTo?.id ?? trip.members[0]?.userId ?? "");
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
    if (!isEditing && assignmentType === "ROTATING" && rotationMembers.length < 2) {
      setError("Un turno rotativo necesita al menos 2 integrantes.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title,
        startDate: startDate || undefined,
        dueDate: scheduleMode === "MANUAL" ? dueDate || undefined : undefined,
        timeTracked: scheduleMode === "TIMER",
      };
      if (isEditing) {
        await api.updateTask(tripId, task!.id, { ...payload, assignedToId: assignmentType === "MANUAL" ? assignedToId : undefined });
      } else {
        await api.createTask(tripId, {
          ...payload,
          assignmentType,
          assignedToId: assignmentType === "MANUAL" ? assignedToId : undefined,
          rotationMembers: assignmentType === "ROTATING" ? rotationMembers : undefined,
        });
      }
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{isEditing ? "Editar tarea" : "Tarea nueva"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Cocinar cena"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">¿Cómo querés controlar el tiempo?</label>
            <div className="mt-1 flex rounded-lg bg-slate-100 p-1 text-sm font-medium dark:bg-slate-700/50">
              <button
                onClick={() => setScheduleMode("MANUAL")}
                className={`flex-1 rounded-md py-1.5 ${scheduleMode === "MANUAL" ? "bg-vaquita-green text-white" : "text-slate-500 dark:text-slate-400"}`}
              >
                Fechas manuales
              </button>
              <button
                onClick={() => setScheduleMode("TIMER")}
                className={`flex-1 rounded-md py-1.5 ${scheduleMode === "TIMER" ? "bg-vaquita-green text-white" : "text-slate-500 dark:text-slate-400"}`}
              >
                Cronómetro
              </button>
            </div>
          </div>

          {scheduleMode === "MANUAL" ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Inicio (opcional)</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Fin</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Inicio</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                Si lo dejás vacío, arranca a contar desde ahora. Al marcarla como hecha vas a ver cuánto tiempo llevó.
              </p>
            </div>
          )}

          {!isEditing && (
            <div className="flex rounded-lg bg-slate-100 p-1 text-sm font-medium dark:bg-slate-700/50">
              <button
                onClick={() => setAssignmentType("MANUAL")}
                className={`flex-1 rounded-md py-1.5 ${assignmentType === "MANUAL" ? "bg-vaquita-green text-white" : "text-slate-500 dark:text-slate-400"}`}
              >
                Asignación manual
              </button>
              <button
                onClick={() => setAssignmentType("ROTATING")}
                className={`flex-1 rounded-md py-1.5 ${assignmentType === "ROTATING" ? "bg-vaquita-green text-white" : "text-slate-500 dark:text-slate-400"}`}
              >
                Turno rotativo
              </button>
            </div>
          )}

          {assignmentType === "MANUAL" ? (
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Asignada a</label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              >
                {trip.members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {displayName(m.user)}
                  </option>
                ))}
              </select>
            </div>
          ) : !isEditing ? (
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Integrantes del turno (en orden)</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {trip.members.map((m) => (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => toggleRotationMember(m.userId)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      rotationMembers.includes(m.userId)
                        ? "border-vaquita-green bg-vaquita-green/10 text-vaquita-greenDark"
                        : "border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {displayName(m.user)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Es un turno rotativo — el orden de integrantes no se puede editar acá, solo título y fechas.
            </p>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-vaquita-green py-2.5 text-sm font-semibold text-white hover:bg-vaquita-greenDark disabled:opacity-60"
          >
            {submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar tarea"}
          </button>
        </div>
      </div>
    </div>
  );
}
