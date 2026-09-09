import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Wallet,
  PiggyBank,
  Receipt,
  ClipboardList,
  UtensilsCrossed,
  Car,
  Home,
  PartyPopper,
  LucideIcon,
  HandCoins,
  Clock,
  ArrowRight,
  Check,
} from "lucide-react";
import { api } from "../lib/api";
import { Task, TripSummary } from "../lib/types";
import { StatCard } from "../components/StatCard";
import { BalanceDetailModal } from "../components/BalanceDetailModal";
import { CompleteTaskModal } from "../components/CompleteTaskModal";
import { useAuth } from "../context/AuthContext";
import { avatarColor, displayName, formatDate, formatDuration, formatMoney, initials } from "../lib/format";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Alimentación: UtensilsCrossed,
  Transporte: Car,
  Alojamiento: Home,
  Ocio: PartyPopper,
  Otros: Receipt,
};

export function Dashboard() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const [summary, setSummary] = useState<TripSummary | null>(null);
  const [showBalanceDetail, setShowBalanceDetail] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);

  function reload() {
    if (tripId) api.getSummary(tripId).then(setSummary);
  }

  useEffect(reload, [tripId]);

  async function toggleTask(task: Task) {
    if (!tripId) return;
    if (task.timeTracked) {
      setCompletingTask(task);
      return;
    }
    await api.completeTask(tripId, task.id);
    reload();
  }

  async function finishTask(task: Task, durationSeconds: number) {
    if (!tripId) return;
    await api.completeTask(tripId, task.id, { durationSeconds });
    setCompletingTask(null);
    reload();
  }

  async function markSettlementPaid(index: number) {
    const s = summary?.settlements[index];
    if (!tripId || !s) return;
    setMarkingId(index);
    try {
      await api.createPayment(tripId, { fromUserId: s.fromUserId, toUserId: s.toUserId, amount: s.amount });
      reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMarkingId(null);
    }
  }

  if (!summary) return <p className="text-slate-400">Cargando resumen...</p>;

  const totalTimeSeconds = summary.timeByParticipant.reduce((s, p) => s + p.totalSeconds, 0);

  const balancePositive = summary.myBalance >= 0;

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowBalanceDetail(true)}
        className={`flex w-full items-center justify-between rounded-2xl border-2 p-6 text-left shadow-sm transition hover:shadow-md ${
          balancePositive ? "border-vaquita-green/40 bg-vaquita-green/5" : "border-red-300/50 bg-red-50"
        }`}
      >
        <div className="flex items-center gap-4">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              balancePositive ? "bg-vaquita-green/15 text-vaquita-greenDark" : "bg-red-100 text-red-500"
            }`}
          >
            <PiggyBank size={26} strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-500">Tu saldo</p>
            <p className={`font-display text-4xl font-bold ${balancePositive ? "text-vaquita-greenDark" : "text-red-500"}`}>
              {balancePositive ? "+" : ""}
              {formatMoney(summary.myBalance)}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">Ver el detalle →</p>
          </div>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${balancePositive ? "bg-vaquita-green/15 text-vaquita-greenDark" : "bg-red-100 text-red-500"}`}>
          {balancePositive ? "A tu favor" : "Debés"}
        </span>
      </button>

      {showBalanceDetail && tripId && user && (
        <BalanceDetailModal tripId={tripId} userId={user.id} onClose={() => setShowBalanceDetail(false)} />
      )}

      <div className="flex gap-4">
        <StatCard icon={Wallet} label="Gasto total" value={formatMoney(summary.totalExpense)} sub={`${summary.expenseCount} gastos registrados`} />
        <StatCard icon={Receipt} label="Pendiente total" value={formatMoney(summary.pendingTotal)} sub="Entre todos" />
        <StatCard icon={ClipboardList} label="Tareas pendientes" value={String(summary.pendingTaskCount)} sub={`Para hoy: ${summary.pendingTasks.length}`} />
      </div>

      {/* Lo principal de la app: saldar cuentas y ver cuánto tiempo metió cada uno */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl border-2 border-vaquita-green/30 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-vaquita-green/10 text-vaquita-greenDark">
              <HandCoins size={18} strokeWidth={2} />
            </span>
            <h2 className="text-base font-bold text-slate-800">Para saldar cuentas</h2>
          </div>
          {summary.settlements.length === 0 ? (
            <p className="text-sm text-slate-400">Todos están al día — nadie le debe nada a nadie. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {summary.settlements.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5 font-medium text-slate-700">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] ${avatarColor(s.fromUserId, s.fromAvatarColor).bg} ${avatarColor(s.fromUserId, s.fromAvatarColor).text}`}>
                      {initials(s.fromName)}
                    </span>
                    <span className="truncate">{s.fromName}</span>
                    <ArrowRight size={13} className="shrink-0 text-slate-400" />
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] ${avatarColor(s.toUserId, s.toAvatarColor).bg} ${avatarColor(s.toUserId, s.toAvatarColor).text}`}>
                      {initials(s.toName)}
                    </span>
                    <span className="truncate">{s.toName}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-bold text-slate-800">{formatMoney(s.amount)}</span>
                    <button
                      onClick={() => markSettlementPaid(i)}
                      disabled={markingId === i}
                      title="Marcar como pagado"
                      className="flex items-center gap-1 rounded-full border border-vaquita-green/40 px-2 py-1 text-xs font-medium text-vaquita-greenDark hover:bg-vaquita-green/10 disabled:opacity-60"
                    >
                      <Check size={12} strokeWidth={2.5} />
                      {markingId === i ? "..." : "Pagado"}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border-2 border-amber-300/40 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Clock size={18} strokeWidth={2} />
            </span>
            <h2 className="text-base font-bold text-slate-800">Tiempo dedicado a tareas</h2>
          </div>
          {summary.timeByParticipant.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no hay tareas con cronómetro completadas.</p>
          ) : (
            <ul className="space-y-2.5">
              {summary.timeByParticipant.map((p) => {
                const pct = totalTimeSeconds ? Math.round((p.totalSeconds / totalTimeSeconds) * 100) : 0;
                return (
                  <li key={p.userId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${avatarColor(p.userId, p.avatarColor).bg} ${avatarColor(p.userId, p.avatarColor).text}`}>
                          {initials(p.name)}
                        </span>
                        {p.name}
                      </span>
                      <span className="font-bold text-slate-800">{formatDuration(p.totalSeconds)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">Saldos entre participantes</h2>
          <div className="space-y-3">
            {summary.balances.map((b) => (
              <div key={b.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(b.userId, b.avatarColor).bg} ${avatarColor(b.userId, b.avatarColor).text}`}
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
                    <p className="text-xs text-slate-400">Pagó: {displayName(e.paidBy)}</p>
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
                  onChange={() => toggleTask(t)}
                  className="h-4 w-4 rounded border-slate-300 accent-vaquita-green"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{t.title}</p>
                  <p className="text-xs text-slate-400">Asignada a: {t.assignedTo ? displayName(t.assignedTo) : "Sin asignar"}</p>
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

      {completingTask && (
        <CompleteTaskModal
          task={completingTask}
          onClose={() => setCompletingTask(null)}
          onConfirm={(durationSeconds) => finishTask(completingTask, durationSeconds)}
        />
      )}
    </div>
  );
}
