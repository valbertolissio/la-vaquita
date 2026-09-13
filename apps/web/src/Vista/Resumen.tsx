import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { api } from "../Utilidades/api";
import { Expense, Payment, TripSummary } from "../Utilidades/types";
import { useAuth } from "../Contexto/AuthContext";
import { avatarColor, displayName, formatDate, formatDuration, formatMoney, initials, paidBySummary } from "../Utilidades/format";
import { useAutoRefresh } from "../Utilidades/useAutoRefresh";

type Seccion = "gasto" | "pendiente" | "aportes" | "pagos" | null;

export function Resumen() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const [summary, setSummary] = useState<TripSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});

  function reload() {
    if (!tripId) return;
    api.getSummary(tripId).then(setSummary);
    api.listExpenses(tripId).then(setExpenses);
    api.listPayments(tripId).then(setPayments);
  }

  useEffect(reload, [tripId]);
  useAutoRefresh(reload, [tripId]);

  if (!summary) return <p className="text-slate-400">Cargando resumen...</p>;

  // Cada KPI se abre y cierra por su cuenta: se pueden tener varios
  // desplegados al mismo tiempo para comparar.
  function toggle(seccion: Exclude<Seccion, null>) {
    setAbiertas((actual) => ({ ...actual, [seccion]: !actual[seccion] }));
  }

  // Cuánto puso el usuario en un gasto puntual (puede haber varios pagadores).
  function miAporte(e: Expense) {
    return Number(e.payers.find((p) => p.userId === user?.id)?.amount ?? 0);
  }

  const pagosRecibidos = payments.filter((p) => p.toUser.id === user?.id);

  const card = "rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm dark:border-slate-700 dark:bg-slate-800";
  const sectionLabel = "text-xs font-bold uppercase tracking-wide text-slate-400";
  const fila = "flex items-center gap-3 py-2.5";
  const filaTitulo = "truncate text-sm font-medium text-slate-800 dark:text-slate-100";
  const filaSub = "text-xs text-slate-400";
  const detalle = "mt-3 border-t border-slate-100 pt-1 dark:border-slate-700";
  const lista = "divide-y divide-slate-100 dark:divide-slate-700";

  function Flecha({ seccion }: { seccion: Exclude<Seccion, null> }) {
    return abiertas[seccion] ? (
      <ChevronUp size={18} className="shrink-0 text-slate-400" />
    ) : (
      <ChevronDown size={18} className="shrink-0 text-slate-400" />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Resumen detallado</h2>

      <button type="button" onClick={() => toggle("gasto")} className={`${card} block w-full`}>
        <div className="flex items-center gap-2">
          <p className={`${sectionLabel} flex-1`}>Gasto total del proyecto</p>
          <Flecha seccion="gasto" />
        </div>
        <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{formatMoney(summary.totalExpense)}</p>
        <p className="text-xs text-slate-400">{summary.expenseCount} gastos registrados. Hacé clic para ver el detalle.</p>

        {abiertas.gasto && (
          <div className={detalle}>
            {expenses.length === 0 ? (
              <p className="py-2 text-sm text-slate-400">Todavía no hay gastos cargados.</p>
            ) : (
              <div className={lista}>
                {expenses.map((e) => (
                  <div key={e.id} className={fila}>
                    <div className="min-w-0 flex-1">
                      <p className={filaTitulo}>{e.description}</p>
                      <p className={filaSub}>
                        {formatDate(e.expenseDate)} · Pagó: {paidBySummary(e.payers, user?.id)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-slate-800 dark:text-slate-100">{formatMoney(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </button>

      <button type="button" onClick={() => toggle("pendiente")} className={`${card} block w-full`}>
        <div className="flex items-center gap-2">
          <p className={`${sectionLabel} flex-1`}>Pendiente de saldar</p>
          <Flecha seccion="pendiente" />
        </div>
        <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{formatMoney(summary.pendingTotal)}</p>
        <p className="text-xs text-slate-400">Lo que falta pagar entre los participantes. Hacé clic para ver quién le debe a quién.</p>

        {abiertas.pendiente && (
          <div className={detalle}>
            {summary.settlements.length === 0 ? (
              <p className="py-2 text-sm text-slate-400">Todos están al día. Nadie le debe nada a nadie.</p>
            ) : (
              <div className={lista}>
                {summary.settlements.map((s, i) => (
                  <div key={i} className={fila}>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarColor(s.fromUserId, s.fromAvatarColor).bg} ${avatarColor(s.fromUserId, s.fromAvatarColor).text}`}
                    >
                      {initials(s.fromName)}
                    </span>
                    <ArrowRight size={13} className="shrink-0 text-slate-400" />
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarColor(s.toUserId, s.toAvatarColor).bg} ${avatarColor(s.toUserId, s.toAvatarColor).text}`}
                    >
                      {initials(s.toName)}
                    </span>
                    <p className={`${filaTitulo} flex-1`}>
                      {s.fromName} a {s.toName}
                    </p>
                    <span className="shrink-0 text-sm font-bold text-slate-800 dark:text-slate-100">{formatMoney(s.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </button>

      <button type="button" onClick={() => toggle("aportes")} className={`${card} block w-full`}>
        <div className="flex items-center gap-2">
          <p className={`${sectionLabel} flex-1`}>Aportes a los gastos</p>
          <Flecha seccion="aportes" />
        </div>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-400">Aportaste</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatMoney(summary.myContribution)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Aportaron otros</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatMoney(summary.othersContribution)}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">Hacé clic para ver gasto por gasto cuánto puso cada lado.</p>

        {abiertas.aportes && (
          <div className={detalle}>
            {expenses.length === 0 ? (
              <p className="py-2 text-sm text-slate-400">Todavía no hay gastos cargados.</p>
            ) : (
              <div className={lista}>
                {expenses.map((e) => {
                  const mio = miAporte(e);
                  const otros = Number(e.amount) - mio;
                  return (
                    <div key={e.id} className={fila}>
                      <div className="min-w-0 flex-1">
                        <p className={filaTitulo}>{e.description}</p>
                        <p className={filaSub}>
                          Vos {formatMoney(mio)} · Otros {formatMoney(otros)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-slate-800 dark:text-slate-100">{formatMoney(e.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </button>

      <button type="button" onClick={() => toggle("pagos")} className={`${card} block w-full`}>
        <div className="flex items-center gap-2">
          <p className={`${sectionLabel} flex-1`}>Te pagaron</p>
          <Flecha seccion="pagos" />
        </div>
        <p className="mt-1 text-2xl font-bold text-vaquita-greenDark">{formatMoney(summary.paidToMe)}</p>
        <p className="text-xs text-slate-400">Pagos que recibiste para saldar cuentas. Hacé clic para ver de quién.</p>

        {abiertas.pagos && (
          <div className={detalle}>
            {pagosRecibidos.length === 0 ? (
              <p className="py-2 text-sm text-slate-400">Todavía no recibiste pagos.</p>
            ) : (
              <div className={lista}>
                {pagosRecibidos.map((p) => (
                  <div key={p.id} className={fila}>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarColor(p.fromUser.id, p.fromUser.avatarColor).bg} ${avatarColor(p.fromUser.id, p.fromUser.avatarColor).text}`}
                    >
                      {initials(displayName(p.fromUser))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={filaTitulo}>{displayName(p.fromUser)}</p>
                      <p className={filaSub}>{formatDate(p.createdAt)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-vaquita-greenDark">{formatMoney(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </button>

      <div className={card}>
        <p className={sectionLabel}>Detalle por participante</p>
        <div className={`mt-3 ${lista}`}>
          {summary.balances.map((b) => (
            <div key={b.userId} className={fila}>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(b.userId, b.avatarColor).bg} ${avatarColor(b.userId, b.avatarColor).text}`}
              >
                {initials(b.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className={filaTitulo}>
                  {b.name}
                  {b.userId === user?.id ? " (vos)" : ""}
                </p>
                <p className={filaSub}>
                  Puso {formatMoney(b.paid)} · Le tocaba {formatMoney(b.owed)}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-bold ${b.balance >= 0 ? "text-vaquita-greenDark" : "text-red-500"}`}>
                {b.balance >= 0 ? "+" : "-"}
                {formatMoney(Math.abs(b.balance))}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={card}>
        <p className={sectionLabel}>Tiempo dedicado a tareas</p>
        {summary.timeByParticipant.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Todavía no hay tareas completadas con tiempo registrado.</p>
        ) : (
          <div className={`mt-3 ${lista}`}>
            {summary.timeByParticipant.map((p) => (
              <div key={p.userId} className={fila}>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(p.userId, p.avatarColor).bg} ${avatarColor(p.userId, p.avatarColor).text}`}
                >
                  {initials(p.name)}
                </span>
                <p className={`${filaTitulo} flex-1`}>{p.name}</p>
                <span className="shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300">{formatDuration(p.totalSeconds)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
