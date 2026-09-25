import { useRef, useState } from "react";
import { X, Camera, Check, Plus } from "lucide-react";
import { api } from "../Utilidades/api";
import { Categoria, Gasto, Proyecto, Participante } from "../Utilidades/tipos";
import { colorDeAvatar, nombreVisible, formatearPlata, iniciales } from "../Utilidades/formato";

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

interface AporteDePagador {
  userId: string;
  amount: string;
}

/** Selector de "¿quién pagó?" — por defecto una sola persona (sin monto visible,
 * paga el total); "+ Más de una persona pagó" habilita un monto por persona,
 * útil por ejemplo cuando en una cena alguien puso más y otro contribuyó. */
function SelectorDePagadores({
  members,
  payers,
  totalAmount,
  onChange,
}: {
  members: Participante[];
  payers: AporteDePagador[];
  totalAmount: number;
  onChange: (next: AporteDePagador[]) => void;
}) {
  function updateUser(i: number, userId: string) {
    onChange(payers.map((p, idx) => (idx === i ? { ...p, userId } : p)));
  }
  function updateAmount(i: number, value: string) {
    onChange(payers.map((p, idx) => (idx === i ? { ...p, amount: value } : p)));
  }
  function addPayer() {
    const used = new Set(payers.map((p) => p.userId));
    const next = members.find((m) => !used.has(m.userId));
    onChange([...payers.map((p) => (payers.length === 1 ? { ...p, amount: "" } : p)), { userId: next?.userId ?? members[0]?.userId ?? "", amount: "" }]);
  }
  function removePayer(i: number) {
    onChange(payers.filter((_, idx) => idx !== i));
  }

  const sum = payers.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const mismatch = payers.length > 1 && totalAmount > 0 && Math.abs(sum - totalAmount) > 0.01;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">¿Quién pagó?</label>
        {payers.length === 1 && (
          <button type="button" onClick={addPayer} className="text-xs font-medium text-vaquita-greenDark hover:underline">
            + Más de una persona pagó
          </button>
        )}
      </div>
      <div className="mt-1 space-y-2">
        {payers.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={p.userId}
              onChange={(e) => updateUser(i, e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {nombreVisible(m.user)}
                </option>
              ))}
            </select>
            {payers.length > 1 && (
              <>
                <input
                  value={p.amount}
                  onChange={(e) => updateAmount(i, e.target.value)}
                  type="number"
                  min="0"
                  placeholder="$ 0,00"
                  className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                />
                <button type="button" onClick={() => removePayer(i)} className="shrink-0 text-slate-400 hover:text-red-500">
                  <X size={16} strokeWidth={2} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      {payers.length > 1 && (
        <button type="button" onClick={addPayer} className="mt-1.5 text-xs font-medium text-vaquita-greenDark hover:underline">
          + Agregar otro pagador
        </button>
      )}
      {mismatch && (
        <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
          La suma (${sum}) no coincide con el total (${totalAmount}).
        </p>
      )}
    </div>
  );
}

/** Selector de categoría con un "+" para crear una nueva sin salir del formulario. */
function SelectorDeCategoria({
  tripId,
  categories,
  categoryId,
  onSelect,
  onCreated,
}: {
  tripId: string;
  categories: Categoria[];
  categoryId: string;
  onSelect: (id: string) => void;
  onCreated: (category: Categoria) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api.crearCategoria(tripId, { name: name.trim() });
      onCreated(created);
      onSelect(created.id);
      setName("");
      setAdding(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Categoría</label>
        <button type="button" onClick={() => setAdding((v) => !v)} className="text-xs font-medium text-vaquita-greenDark hover:underline">
          {adding ? "Cancelar" : "+ Nueva categoría"}
        </button>
      </div>
      {adding ? (
        <div className="mt-1 flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Nombre de la categoría"
            autoFocus
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="shrink-0 rounded-lg bg-vaquita-green p-2 text-white disabled:opacity-60"
          >
            <Plus size={15} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <select
          value={categoryId}
          onChange={(e) => onSelect(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface Props {
  tripId: string;
  trip: Proyecto;
  expense?: Gasto;
  onClose: () => void;
  onCreated: () => void;
}

export function ModalNuevoGasto({ tripId, trip, expense, onClose, onCreated }: Props) {
  const isEditing = !!expense;
  const [tab, setTab] = useState<"manual" | "ocr">("manual");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [categories, setCategories] = useState<Categoria[]>(trip.categories);
  const [categoryId, setCategoryId] = useState(expense?.category?.id ?? trip.categories[0]?.id ?? "");

  function handleCategoryCreated(category: Categoria) {
    setCategories((prev) => [...prev, category]);
  }
  const [payers, setPayers] = useState<AporteDePagador[]>(
    expense && expense.payers.length > 0
      ? expense.payers.map((p) => ({ userId: p.userId, amount: String(p.amount) }))
      : [{ userId: trip.members[0]?.userId ?? "", amount: "" }]
  );
  const [ocrPaidById, setOcrPaidById] = useState(trip.members[0]?.userId ?? "");
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
  const [scanItems, setScanItems] = useState<{ description: string; amount: string; checked: boolean }[]>([]);
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
      const result = await api.escanearComprobante(tripId, file);
      setReceiptUrl(result.receiptUrl);
      if (result.expenseDate) setExpenseDate(toDateInputValue(result.expenseDate));

      if (result.items && result.items.length > 0) {
        setScanItems(result.items.map((it) => ({ description: it.description, amount: String(it.amount), checked: true })));
        setScanNotice(null);
      } else if (result.amount) {
        // El OCR no logró separar los renglones pero sí leyó un importe. Se
        // ofrece como un ítem más, editable, en vez de mandar al usuario al
        // formulario manual: lo que se carga son los ítems, no el total.
        setScanItems([{ description: result.merchant ?? "", amount: String(result.amount), checked: true }]);
        setScanNotice("Solo pudimos leer un importe. Editalo o agregá los ítems que falten.");
      } else {
        setScanNotice("No pudimos leer bien el ticket. Completá los datos a mano.");
        setTab("manual");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  }

  function toggleItem(index: number) {
    setScanItems((prev) => prev.map((it, i) => (i === index ? { ...it, checked: !it.checked } : it)));
  }

  function updateItem(index: number, field: "description" | "amount", value: string) {
    setScanItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function removeItem(index: number) {
    setScanItems((prev) => prev.filter((_, i) => i !== index));
  }

  /** Renglón vacío, para cargar a mano un ítem que el OCR no pudo leer. */
  function agregarItem() {
    setScanItems((prev) => [...prev, { description: "", amount: "", checked: true }]);
  }

  function resetScan() {
    setScanItems([]);
    setScanNotice(null);
    setReceiptUrl(null);
  }

  async function handleSubmitItems() {
    setError(null);
    const checked = scanItems.filter((it) => it.checked);
    if (checked.length === 0) {
      setError("Elegí al menos un ítem.");
      return;
    }
    if (splitBetween.length === 0) {
      setError("Elegí entre quiénes se divide.");
      return;
    }
    for (const item of checked) {
      if (!item.description.trim() || !item.amount || Number(item.amount) <= 0) {
        setError("Revisá que cada ítem tenga descripción y monto.");
        return;
      }
    }
    setSubmitting(true);
    try {
      for (const item of checked) {
        const itemAmount = Number(item.amount);
        await api.crearGasto(tripId, {
          description: item.description.trim(),
          amount: itemAmount,
          categoryId: categoryId || undefined,
          payers: [{ userId: ocrPaidById, amount: itemAmount }],
          splitBetween,
          expenseDate: expenseDate || undefined,
          receiptUrl: receiptUrl ?? undefined,
          source: "OCR" as const,
        });
      }
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!description || !amount || Number(amount) <= 0 || splitBetween.length === 0) {
      setError("Completá descripción, monto y entre quiénes se divide.");
      return;
    }
    const totalAmount = Number(amount);
    let finalPayers: { userId: string; amount: number }[];
    if (payers.length === 1) {
      finalPayers = [{ userId: payers[0].userId, amount: totalAmount }];
    } else {
      finalPayers = payers.map((p) => ({ userId: p.userId, amount: Number(p.amount) || 0 }));
      const sum = Math.round(finalPayers.reduce((s, p) => s + p.amount, 0) * 100) / 100;
      if (finalPayers.some((p) => p.amount <= 0)) {
        setError("Completá cuánto pagó cada persona.");
        return;
      }
      if (Math.abs(sum - totalAmount) > 0.01) {
        setError(`La suma de lo que pagó cada persona (${sum}) no coincide con el total (${totalAmount}).`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        description,
        amount: totalAmount,
        categoryId: categoryId || undefined,
        payers: finalPayers,
        splitBetween,
        notes: notes || undefined,
        expenseDate: expenseDate || undefined,
        receiptUrl: receiptUrl ?? undefined,
        source: receiptUrl ? ("OCR" as const) : undefined,
      };
      if (isEditing) {
        await api.actualizarGasto(tripId, expense!.id, payload);
      } else {
        await api.crearGasto(tripId, payload);
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
          scanItems.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Encontramos {scanItems.length} ítems en el ticket</p>

              {scanNotice && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-500/10">{scanNotice}</p>
              )}

              <div className="space-y-2">
                {scanItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleItem(idx)}
                      className={`mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        item.checked ? "border-vaquita-green bg-vaquita-green text-white" : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {item.checked && <Check size={12} strokeWidth={3} />}
                    </button>
                    <div className="flex-1 space-y-1.5">
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        placeholder="Descripción"
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                      />
                      <input
                        value={item.amount}
                        onChange={(e) => updateItem(idx, "amount", e.target.value)}
                        type="number"
                        min="0"
                        placeholder="$ 0,00"
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="mt-2 shrink-0 text-slate-400 hover:text-red-500"
                    >
                      <X size={16} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={agregarItem}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-vaquita-green py-2 text-xs font-semibold text-vaquita-greenDark hover:bg-vaquita-green/10"
              >
                <Plus size={14} strokeWidth={2.5} /> Agregar ítem
              </button>

              <SelectorDeCategoria tripId={tripId} categories={categories} categoryId={categoryId} onSelect={setCategoryId} onCreated={handleCategoryCreated} />

              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">¿Quién pagó?</label>
                <select
                  value={ocrPaidById}
                  onChange={(e) => setOcrPaidById(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                >
                  {trip.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {nombreVisible(m.user)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">¿Entre quiénes se divide?</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {trip.members.map((m) => {
                    const color = colorDeAvatar(m.userId, m.user.avatarColor);
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
                          {iniciales(nombreVisible(m.user))}
                        </span>
                        {nombreVisible(m.user)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                onClick={handleSubmitItems}
                disabled={submitting}
                className="w-full rounded-lg bg-vaquita-green py-2.5 text-sm font-semibold text-white hover:bg-vaquita-greenDark disabled:opacity-60"
              >
                {submitting ? "Guardando..." : `Crear ${scanItems.filter((it) => it.checked).length} gastos`}
              </button>

              <button type="button" onClick={resetScan} className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                Escanear otro ticket
              </button>
            </div>
          ) : (
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
          )
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
            <SelectorDeCategoria tripId={tripId} categories={categories} categoryId={categoryId} onSelect={setCategoryId} onCreated={handleCategoryCreated} />
            <SelectorDePagadores members={trip.members} payers={payers} totalAmount={Number(amount) || 0} onChange={setPayers} />
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">¿Entre quiénes se divide?</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {trip.members.map((m) => {
                  const color = colorDeAvatar(m.userId, m.user.avatarColor);
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
                        {iniciales(nombreVisible(m.user))}
                      </span>
                      {nombreVisible(m.user)}
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
