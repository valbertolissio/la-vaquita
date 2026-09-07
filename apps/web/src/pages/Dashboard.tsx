import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Wallet, PiggyBank, Receipt, ClipboardList, UtensilsCrossed, Car, Home, PartyPopper, LucideIcon } from "lucide-react";
import { api } from "../lib/api";
import { TripSummary } from "../lib/types";
import { StatCard } from "../components/StatCard";
import { avatarColor, formatDate, formatMoney, initials } from "../lib/format";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Alimentación: UtensilsCrossed,
  Transporte: Car,
  Alojamiento: Home,
  Ocio: PartyPopper,
  Otros: Receipt,
};

export function Dashboard() {
  const { tripId } = useParams();
  const [summary, setSummary] = useState<TripSummary | null>(null);

  function reload() {
    if (tripId) api.getSummary(tripId).then(setSummary);
  }

  useEffect(reload, [tripId]);

  async function toggleTask(taskId: string) {
    if (!tripId) return;
    await api.completeTask(tripId, taskId);
    reload();
  }

  if (!summary) return <p className="text-slate-400">Cargando resumen...</p>;

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <StatCard icon={Wallet} label="Gasto total" value={formatMoney(summary.totalExpense)} sub={`${summary.expenseCount} gastos registrados`} />
        <StatCard
          icon={PiggyBank}
          label="Tu saldo"
          value={`${summary.myBalance >= 0 ? "+" : ""}${formatMoney(summary.myBalance)}`}
          sub={summary.myBalance >= 0 ? "A tu favor" : "Debés"}
          tone={summary.myBalance >= 0 ? "positive" : "negative"}
        />
        <StatCard icon={Receipt} label="Pendiente total" value={formatMoney(summary.pendingTotal)} sub="Entre todos" />
        <StatCard icon={ClipboardList} label="Tareas pendientes" value={String(summary.pendingTaskCount)} sub={`Para hoy: ${summary.pendingTasks.length}`} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">Saldos entre participantes</h2>
          <div className="space-y-3">
            {summary.balances.map((b) => (
              <div key={b.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(b.userId).bg} ${avatarColor(b.userId).text}`}
                  >
                    {initials(b.name)}
                  </span>
                  <span className="text-sm text-slate-700">{b.name}</span>
                </div>
                <span className={`text-sm font-semibold ${b.balance >= 0 ? "text-vaquita-greenDark" : "text-red-500"}`}>
                  {b.balance >= 0 ? "+ " : "- "}
                  {formatMoney(Math.abs(b.balance)).replace("-", "")}
                </span>
              </div>
            ))}
          </div>
          <Link to={`/trips/${tripId}/participantes`} className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
            Ver detalle de saldos →
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Últimos gastos</h2>
            <Link to={`/trips/${tripId}/gastos`} className="text-sm font-medium text-blue-600 hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {summary.recentExpenses.map((e) => {
              const CategoryIcon = CATEGORY_ICONS[e.category?.name ?? "Otros"] ?? Receipt;
              return (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <CategoryIcon size={15} strokeWidth={2} />
                  </span>
                  <div>
                    <p className="font-medium text-slate-800">{e.description}</p>
                    <p className="text-xs text-slate-400">Pagó: {e.paidBy.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">{formatMoney(e.amount)}</p>
                  <p className="text-xs text-slate-400">{formatDate(e.expenseDate)}</p>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">Tareas</h2>
          <div className="space-y-3">
            {summary.pendingTasks.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  onChange={() => toggleTask(t.id)}
                  className="h-4 w-4 rounded border-slate-300 accent-vaquita-green"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{t.title}</p>
                  <p className="text-xs text-slate-400">Asignada a: {t.assignedTo?.name ?? "Sin asignar"}</p>
                </div>
                {t.dueDate && <span className="text-xs text-slate-400">{formatDate(t.dueDate)}</span>}
              </label>
            ))}
            {summary.pendingTasks.length === 0 && <p className="text-sm text-slate-400">No hay tareas pendientes.</p>}
          </div>
          <Link to={`/trips/${tripId}/tareas`} className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
            Ver todas las tareas →
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">Gráfico de gastos por categoría</h2>
          {summary.expensesByCategory.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no hay gastos cargados.</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={summary.expensesByCategory} dataKey="total" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {summary.expensesByCategory.map((c, i) => (
                        <Cell key={i} fill={c.color ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-1.5 text-sm">
                {summary.expensesByCategory.map((c) => {
                  const pct = summary.totalExpense ? Math.round((c.total / summary.totalExpense) * 100) : 0;
                  return (
                    <li key={c.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color ?? "#94a3b8" }} />
                        {c.name}
                      </span>
                      <span className="text-slate-500">
                        {pct}% ({formatMoney(c.total)})
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
