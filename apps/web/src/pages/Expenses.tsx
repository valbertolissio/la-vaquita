import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2, UtensilsCrossed, Car, Home, PartyPopper, Receipt, LucideIcon } from "lucide-react";
import { api } from "../lib/api";
import { Expense, Trip } from "../lib/types";
import { formatDate, formatMoney } from "../lib/format";
import { NewExpenseModal } from "../components/NewExpenseModal";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Alimentación: UtensilsCrossed,
  Transporte: Car,
  Alojamiento: Home,
  Ocio: PartyPopper,
  Otros: Receipt,
};

export function Expenses() {
  const { tripId } = useParams();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function reload() {
    if (!tripId) return;
    api.listExpenses(tripId).then(setExpenses);
  }

  useEffect(() => {
    reload();
    if (tripId) api.getTrip(tripId).then(setTrip);
  }, [tripId]);

  async function handleDelete(expenseId: string) {
    if (!tripId) return;
    if (!confirm("¿Eliminar este gasto? Los saldos se recalculan automáticamente.")) return;
    setDeletingId(expenseId);
    try {
      await api.deleteExpense(tripId, expenseId);
      reload();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Gastos</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-vaquita-green px-4 py-2 text-sm font-semibold text-white hover:bg-vaquita-greenDark"
        >
          <Plus size={16} strokeWidth={2.5} /> Gasto nuevo
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Pagó</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {expenses === null && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Cargando gastos...
                </td>
              </tr>
            )}
            {expenses?.map((e) => {
              const CategoryIcon = CATEGORY_ICONS[e.category?.name ?? "Otros"] ?? Receipt;
              return (
                <tr key={e.id} className="group border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{e.description}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CategoryIcon size={14} strokeWidth={2} className="text-slate-400" />
                      {e.category?.name ?? "Otros"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{e.paidBy.name}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(e.expenseDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatMoney(e.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deletingId === e.id}
                      className="text-slate-300 opacity-0 transition hover:text-red-500 disabled:opacity-100 group-hover:opacity-100"
                      title="Eliminar gasto"
                    >
                      <Trash2 size={15} strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {expenses?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Todavía no cargaste ningún gasto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && trip && tripId && (
        <NewExpenseModal
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
