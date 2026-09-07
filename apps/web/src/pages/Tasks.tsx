import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2, Repeat } from "lucide-react";
import { api } from "../lib/api";
import { Task, Trip } from "../lib/types";
import { formatDate } from "../lib/format";
import { NewTaskModal } from "../components/NewTaskModal";

export function Tasks() {
  const { tripId } = useParams();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function reload() {
    if (!tripId) return;
    api.listTasks(tripId).then(setTasks);
  }

  useEffect(() => {
    reload();
    if (tripId) api.getTrip(tripId).then(setTrip);
  }, [tripId]);

  async function toggleDone(task: Task) {
    if (!tripId || task.status === "DONE") return;
    await api.completeTask(tripId, task.id);
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

      <div className="space-y-2">
        {tasks === null && <p className="text-sm text-slate-400">Cargando tareas...</p>}
        {tasks?.map((t) => (
          <div
            key={t.id}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <label className="flex flex-1 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={t.status === "DONE"}
                onChange={() => toggleDone(t)}
                className="h-4 w-4 rounded border-slate-300 accent-vaquita-green"
              />
              <div className="flex-1">
                <p className={`font-medium ${t.status === "DONE" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                  {t.title}
                </p>
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  Asignada a: {t.assignedTo?.name ?? "Sin asignar"}
                  {t.assignmentType === "ROTATING" && (
                    <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-vaquita-green/10 px-1.5 py-0.5 text-[10px] font-medium text-vaquita-greenDark">
                      <Repeat size={10} strokeWidth={2.5} /> Turno rotativo
                    </span>
                  )}
                </p>
              </div>
            </label>
            {t.dueDate && <span className="text-xs text-slate-400">{formatDate(t.dueDate)}</span>}
            <button
              onClick={() => handleDelete(t.id)}
              disabled={deletingId === t.id}
              className="text-slate-300 opacity-0 transition hover:text-red-500 disabled:opacity-100 group-hover:opacity-100"
              title="Eliminar tarea"
            >
              <Trash2 size={15} strokeWidth={2} />
            </button>
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
    </div>
  );
}
