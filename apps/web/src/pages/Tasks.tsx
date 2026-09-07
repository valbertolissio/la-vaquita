import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Repeat, Clock } from "lucide-react";
import { api } from "../lib/api";
import { Task, Trip } from "../lib/types";
import { formatDate, formatDuration } from "../lib/format";
import { NewTaskModal } from "../components/NewTaskModal";
import { LiveTimer } from "../components/LiveTimer";

export function Tasks() {
  const { tripId } = useParams();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function reload() {
    if (!tripId) return;
    api.listTasks(tripId).then(setTasks);
  }

  useEffect(() => {
    reload();
    if (tripId) api.getTrip(tripId).then(setTrip);
  }, [tripId]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  async function toggleDone(task: Task) {
    if (!tripId || task.status === "DONE") return;
    const result = await api.completeTask(tripId, task.id);
    const durationText = result.durationSeconds != null ? ` (te llevó ${formatDuration(result.durationSeconds)})` : "";
    if (result.rotated && result.nextAssignee) {
      setToast(`¡Listo${durationText}! Ahora le toca a ${result.nextAssignee.name}.`);
    } else {
      setToast(`¡Tarea completada${durationText}!`);
    }
    reload();
  }

  async function handleDelete(taskId: string) {
    if (!tripId) return;
    if (!confirm("¿Eliminar esta tarea?")) return;
    setDeletingId(taskId);
    try {
      await api.deleteTask(tripId, taskId);
      reload();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Tareas</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-vaquita-green px-4 py-2 text-sm font-semibold text-white hover:bg-vaquita-greenDark"
        >
          <Plus size={16} strokeWidth={2.5} /> Tarea nueva
        </button>
      </div>

      {toast && (
        <div className="mb-4 rounded-lg border border-vaquita-green/30 bg-vaquita-green/10 px-4 py-2.5 text-sm font-medium text-vaquita-greenDark">
          {toast}
        </div>
      )}

      <div className="space-y-2">
        {tasks === null && <p className="text-sm text-slate-400">Cargando tareas...</p>}
        {tasks?.map((t) => (
          <div key={t.id} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <label className="flex flex-1 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={t.status === "DONE"}
                onChange={() => toggleDone(t)}
                className="h-4 w-4 rounded border-slate-300 accent-vaquita-green"
              />
              <div className="flex-1">
                <p className={`font-medium ${t.status === "DONE" ? "text-slate-400 line-through" : "text-slate-800"}`}>{t.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>Asignada a: {t.assignedTo?.name ?? "Sin asignar"}</span>
                  {t.assignmentType === "ROTATING" && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-vaquita-green/10 px-1.5 py-0.5 font-medium text-vaquita-greenDark">
                      <Repeat size={10} strokeWidth={2.5} /> Turno rotativo
                    </span>
                  )}
                  {t.timeTracked && t.startDate && t.status === "PENDING" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                      <Clock size={10} strokeWidth={2.5} />
                      <LiveTimer startDate={t.startDate} />
                    </span>
                  )}
                </div>
              </div>
            </label>
            {t.dueDate && <span className="text-xs text-slate-400">{formatDate(t.dueDate)}</span>}
            <div className="flex items-center gap-3 opacity-0 transition group-hover:opacity-100">
              <button onClick={() => setEditingTask(t)} className="text-slate-300 hover:text-slate-600" title="Editar tarea">
                <Pencil size={15} strokeWidth={2} />
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                disabled={deletingId === t.id}
                className="text-slate-300 hover:text-red-500 disabled:opacity-60"
                title="Eliminar tarea"
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
        {tasks?.length === 0 && <p className="text-sm text-slate-400">Todavía no hay tareas.</p>}
      </div>

      {showModal && trip && tripId && (
        <NewTaskModal
          tripId={tripId}
          trip={trip}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            reload();
          }}
        />
      )}
      {editingTask && trip && tripId && (
        <NewTaskModal
          tripId={tripId}
          trip={trip}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onCreated={() => {
            setEditingTask(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
