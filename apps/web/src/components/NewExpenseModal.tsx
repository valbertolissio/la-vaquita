import { useRef, useState } from "react";
import { X, Camera, Check } from "lucide-react";
import { api } from "../lib/api";
import { Expense, Trip } from "../lib/types";
import { avatarColor, displayName, initials } from "../lib/format";

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

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
  const [expenseDate, setExpenseDate] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleMember(userId: string) {
    setSplitBetween((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !tripId) return;
    setScanning(true);
    setScanNotice(null);
    try {
      const result = await api.scanReceipt(tripId, file);
      setReceiptUrl(result.receiptUrl);
      if (result.merchant) setDescription(result.merchant);
      if (result.amount) setAmount(String(result.amount));
      if (result.expenseDate) setExpenseDate(toDateInputValue(result.expenseDate));
      setScanNotice(
        result.amount || result.merchant
          ? "Revisá los datos que completamos automáticamente antes de guardar."
          : "No pudimos leer bien el ticket — completá los datos a mano."
      );
      setTab("manual");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
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
        expenseDate: expenseDate || undefined,
        receiptUrl: receiptUrl ?? undefined,
        source: receiptUrl ? ("OCR" as const) : undefined,
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
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{isEditing ? "Editar gasto" : "Gasto nuevo"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {!isEditing && (
          <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm font-medium dark:bg-slate-700/50">
            <button
              onClick={() => setTab("manual")}
              className={`flex-1 rounded-md py-1.5 ${tab === "manual" ? "bg-vaquita-green text-white" : "text-slate-500 dark:text-slate-400"}`}
            >
              Manual
            </button>
            <button
              onClick={() => setTab("ocr")}
              className={`flex-1 rounded-md py-1.5 ${tab === "ocr" ? "bg-vaquita-green text-white" : "text-slate-500 dark:text-slate-400"}`}
            >
              Con comprobante (OCR)
            </button>
          </div>
        )}

        {tab === "ocr" ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelected}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
              className="mb-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-10 text-center text-slate-500 hover:border-vaquita-green hover:text-vaquita-greenDark disabled:opacity-60 dark:border-slate-600 dark:text-slate-400"
            >
              <Camera size={28} strokeWidth={1.8} />
              <p className="text-sm font-medium">{scanning ? "Leyendo el ticket..." : "Sacá una foto del ticket"}</p>
              <p className="text-xs">o elegí de tu galería</p>
              <p className="mt-2 text-xs text-slate-400">(El reconocimiento OCR pre-completa el formulario manual)</p>
            </button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {scanNotice && (
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-500/10">
                <Check size={13} strokeWidth={2.5} /> {scanNotice}
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">¿Qué fue?</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cena en restaurante"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">¿Cuánto fue?</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min="0"
                placeholder="$ 0,00"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Fecha (opcional)</label>
              <input
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              >
                {trip.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">¿Quién pagó?</label>
              <select
                value={paidById}
                onChange={(e) => setPaidById(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              >
                {trip.members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {displayName(m.user)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">¿Entre quiénes se divide?</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {trip.members.map((m) => {
                  const color = avatarColor(m.userId, m.user.avatarColor);
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => toggleMember(m.userId)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        splitBetween.includes(m.userId)
                          ? "border-vaquita-green bg-vaquita-green/10 text-vaquita-greenDark"
                          : "border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${color.bg} ${color.text}`}>
                        {initials(displayName(m.user))}
                      </span>
                      {displayName(m.user)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Notas (opcional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cena del primer día"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
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
