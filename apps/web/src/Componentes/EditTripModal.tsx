import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { api } from "../Utilidades/api";
import { Category, Trip } from "../Utilidades/types";

interface Props {
  trip: Trip;
  onClose: () => void;
  onUpdated: (trip: Trip) => void;
  onDeleted?: () => void;
}

export function EditTripModal({ trip, onClose, onUpdated, onDeleted }: Props) {
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(trip.startDate.slice(0, 10));
  const [endDate, setEndDate] = useState(trip.endDate.slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [categories, setCategories] = useState<Category[]>(trip.categories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

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

  function syncCategories(next: Category[]) {
    setCategories(next);
    onUpdated({ ...trip, categories: next });
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    setCategoryError(null);
    setAddingCategory(true);
    try {
      const created = await api.createCategory(trip.id, { name: newCategoryName.trim() });
      syncCategories([...categories, created]);
      setNewCategoryName("");
    } catch (e: any) {
      setCategoryError(e.message);
    } finally {
      setAddingCategory(false);
    }
  }

  function handleCategoryNameChange(id: string, name: string) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  async function handleRenameCategory(category: Category) {
    const original = trip.categories.find((c) => c.id === category.id);
    if (!category.name.trim() || category.name === original?.name) return;
    setCategoryError(null);
    setBusyCategoryId(category.id);
    try {
      const updated = await api.updateCategory(trip.id, category.id, { name: category.name.trim() });
      syncCategories(categories.map((c) => (c.id === category.id ? updated : c)));
    } catch (e: any) {
      setCategoryError(e.message);
    } finally {
      setBusyCategoryId(null);
    }
  }

  async function handleDeleteCategory(id: string) {
    setCategoryError(null);
    setBusyCategoryId(id);
    try {
      await api.deleteCategory(trip.id, id);
      syncCategories(categories.filter((c) => c.id !== id));
    } catch (e: any) {
      setCategoryError(e.message);
    } finally {
      setBusyCategoryId(null);
    }
  }

  async function handleDelete() {
    if (!onDeleted) return;
    if (!confirm(`¿Seguro que querés eliminar "${trip.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await api.deleteTrip(trip.id);
      onDeleted();
    } catch (e: any) {
      setError(e.message);
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Editar proyecto</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Categorías de gasto</label>
            <div className="mt-2 space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color ?? "#94a3b8" }}
                  />
                  <input
                    value={category.name}
                    onChange={(e) => handleCategoryNameChange(category.id, e.target.value)}
                    onBlur={() => handleRenameCategory(category)}
                    disabled={busyCategoryId === category.id}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-60 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(category.id)}
                    disabled={busyCategoryId === category.id}
                    className="shrink-0 text-slate-400 hover:text-red-500 disabled:opacity-60"
                  >
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                placeholder="Nueva categoría"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={addingCategory || !newCategoryName.trim()}
                className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                <Plus size={15} strokeWidth={2} />
              </button>
            </div>
            {categoryError && <p className="mt-1.5 text-xs text-red-500">{categoryError}</p>}
            <p className="mt-1.5 text-[11px] text-slate-400">No se puede eliminar una categoría que ya tiene gastos cargados.</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-vaquita-green py-2.5 text-sm font-semibold text-white hover:bg-vaquita-greenDark disabled:opacity-60"
          >
            {submitting ? "Guardando..." : "Guardar cambios"}
          </button>

          {onDeleted && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full rounded-lg border border-red-200 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:hover:bg-red-500/10"
            >
              {deleting ? "Eliminando..." : "Eliminar proyecto"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
