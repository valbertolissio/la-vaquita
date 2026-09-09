import { useState } from "react";
import { X, Clock } from "lucide-react";
import { Task } from "../lib/types";
import { secondsSince } from "../lib/format";

interface CompleteTaskModalProps {
  task: Task;
  onClose: () => void;
  onConfirm: (durationSeconds: number) => void;
  submitting?: boolean;
}

export function CompleteTaskModal({ task, onClose, onConfirm, submitting }: CompleteTaskModalProps) {
  const elapsed = task.startDate ? secondsSince(task.startDate) : 0;
  const [hours, setHours] = useState(Math.floor(elapsed / 3600));
  const [minutes, setMinutes] = useState(Math.floor((elapsed % 3600) / 60));
  const [seconds, setSeconds] = useState(elapsed % 60);

  function handleConfirm() {
    const total = Math.max(0, hours) * 3600 + Math.max(0, minutes) * 60 + Math.max(0, seconds);
    onConfirm(total);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Clock size={18} strokeWidth={2} />
            </span>
            <h3 className="text-base font-semibold text-slate-800">¿Cuánto tardaste?</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">"{task.title}" — ajustá el tiempo si el cronómetro no arrancó justo a tiempo.</p>
        <div className="mb-5 flex items-center justify-center gap-2">
          {[
            { value: hours, set: setHours, label: "hs" },
            { value: minutes, set: setMinutes, label: "min" },
            { value: seconds, set: setSeconds, label: "seg" },
          ].map((field) => (
            <div key={field.label} className="flex flex-col items-center gap-1">
              <input
                type="number"
                min={0}
                value={field.value}
                onChange={(e) => field.set(Math.max(0, Number(e.target.value) || 0))}
                className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-center text-lg font-semibold"
              />
              <span className="text-xs text-slate-400">{field.label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full rounded-lg bg-vaquita-green px-4 py-2 text-sm font-semibold text-white hover:bg-vaquita-greenDark disabled:opacity-60"
        >
          {submitting ? "Guardando..." : "Marcar como hecha"}
        </button>
      </div>
    </div>
  );
}
