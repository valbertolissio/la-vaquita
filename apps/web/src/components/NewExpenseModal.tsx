import { useState } from "react";
import { X, Camera } from "lucide-react";
import { api } from "../lib/api";
import { Expense, Trip } from "../lib/types";
import { avatarColor, initials } from "../lib/format";

interface Props {
  tripId: string;
  trip: Trip;
  expense?: Expense;
  onClose: () => void;
  onCreated: () => void;
}

export function NewExpenseModal({ tripId, trip, expense, onClose, onCreated }: Props) {
  const isEditing = !!expense;
  const [tab, setTab] = useState<"manual" | "ocr">("manual");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [categoryId, setCategoryId] = useState(expense?.category?.id ?? trip.categories[0]?.id ?? "");
  const [paidById, setPaidById] = useState(expense?.paidBy.id ?? trip.members[0]?.userId ?? "");
  const [splitBetween, setSplitBetween] = useState<string[]>(
    expense ? expense.splits.map((s) => s.userId) : trip.members.map((m) => m.userId)
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleMember(userId: string) {
    setSplitBetween((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleSubmit() {
    setError(null);
    if (!description || !amount || Number(amount) <= 0 || splitBetween.length === 0) {
      setError("Completá descripción, monto y entre quiénes se divide.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        description,
        amount: Number(amount),
        categoryId: categoryId || undefined,
        paidById,
        splitBetween,
        notes: notes || undefined,
      };
      if (isEditing) {
        await api.updateExpense(tripId, expense!.id, payload);
      } else {
        await api.createExpense(tripId, payload);
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
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{isEditing ? "Editar gasto" : "Gasto nuevo"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {!isEditing && (
          <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
            <button
              onClick={() => setTab("manual")}
              className={`flex-1 rounded-md py-1.5 ${tab === "manual" ? "bg-vaquita-green text-white" : "text-slate-500"}`}
            >
              Manual
            </button>
            <button
              onClick={() => setTab("ocr")}
              className={`flex-1 rounded-md py-1.5 ${tab === "ocr" ? "bg-vaquita-green text-white" : "text-slate-500"}`}
            >
              Con comprobante (OCR)
            </button>
          </div>
        )}

        {tab === "ocr" ? (
          <div className="mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-10 text-center text-slate-500">
            <Camera size={28} strokeWidth={1.8} />
            <p className="text-sm font-medium">Sacá una foto del ticket</p>
            <p className="text-xs">o elegí de tu galería</p>
            <p className="mt-2 text-xs text-slate-400">(El reconocimiento OCR pre-completa el formulario manual)</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500">¿Qué fue?</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cena en restaurante"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">¿Cuánto fue?</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min="0"
                placeholder="$ 0,00"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {trip.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">¿Quién pagó?</label>
              <select
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {trip.members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">¿Entre quiénes se divide?</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {trip.members.map((m) => {
                  const color = avatarColor(m.userId);
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => toggleMember(m.userId)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        splitBetween.includes(m.userId)
                          ? "border-vaquita-green bg-vaquita-green/10 text-vaquita-greenDark"
                          : "border-slate-300 text-slate-500"
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${color.bg} ${color.text}`}>
                        {initials(m.user.name)}
                      </span>
                      {m.user.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Notas (opcional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cena del primer día"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-2 w-full rounded-lg bg-vaquita-green py-2.5 text-sm font-semibold text-white hover:bg-vaquita-greenDark disabled:opacity-60"
            >
              {submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Guardar gasto"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
