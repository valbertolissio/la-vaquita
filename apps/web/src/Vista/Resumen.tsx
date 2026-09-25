import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { api } from "../Utilidades/api";
import { Gasto, Pago, ResumenDelProyecto } from "../Utilidades/tipos";
import { useSesion } from "../Contexto/ContextoDeSesion";
import { colorDeAvatar, nombreVisible, formatearFecha, formatearDuracion, formatearPlata, iniciales, resumenDePagadores } from "../Utilidades/formato";
import { useActualizacionAutomatica } from "../Utilidades/useActualizacionAutomatica";

type Seccion = "gasto" | "pendiente" | "aportes" | "pagos" | null;

export function Resumen() {
  const { tripId } = useParams();
  const { user } = useSesion();
  const [summary, setSummary] = useState<ResumenDelProyecto | null>(null);
  const [expenses, setExpenses] = useState<Gasto[]>([]);
  const [payments, setPayments] = useState<Pago[]>([]);
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});

  function reload() {
    if (!tripId) return;
    api.obtenerResumen(tripId).then(setSummary);
    api.listarGastos(tripId).then(setExpenses);
    api.listarPagos(tripId).then(setPayments);
  }

  useEffect(reload, [tripId]);
  useActualizacionAutomatica(reload, [tripId]);

  if (!summary) return <p className="text-slate-400">Cargando resumen...</p>;

  // Cada KPI se abre y cierra por su cuenta: se pueden tener varios
  // desplegados al mismo tiempo para comparar.
  function toggle(seccion: Exclude<Seccion, null>) {
    setAbiertas((actual) => ({ ...actual, [seccion]: !actual[seccion] }));
  }

  // Cuánto puso el usuario en un gasto puntual (puede haber varios pagadores).
  function miAporte(e: Gasto) {
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
        <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{formatearPlata(summary.totalExpense)}</p>
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
                        {formatearFecha(e.expenseDate)} · Pagó: {resumenDePagadores(e.payers, user?.id)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-slate-800 dark:text-slate-100">{formatearPlata(e.amount)}</span>
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
        <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{formatearPlata(summary.pendingTotal)}</p>
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
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${colorDeAvatar(s.fromUserId, s.fromAvatarColor).bg} ${colorDeAvatar(s.fromUserId, s.fromAvatarColor).text}`}
                    >
                      {iniciales(s.fromName)}
                    </span>
                    <ArrowRight size={13} className="shrink-0 text-slate-400" />
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${colorDeAvatar(s.toUserId, s.toAvatarColor).bg} ${colorDeAvatar(s.toUserId, s.toAvatarColor).text}`}
                    >
                      {iniciales(s.toName)}
                    </span>
                    <p className={`${filaTitulo} flex-1`}>
                      {s.fromName} a {s.toName}
                    </p>
                    <span className="shrink-0 text-sm font-bold text-slate-800 dark:text-slate-100">{formatearPlata(s.amount)}</span>
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
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatearPlata(summary.myContribution)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Aportaron otros</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatearPlata(summary.othersContribution)}</p>
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
                          Vos {formatearPlata(mio)} · Otros {formatearPlata(otros)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-slate-800 dark:text-slate-100">{formatearPlata(e.amount)}</span>
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
        <p className="mt-1 text-2xl font-bold text-vaquita-greenDark">{formatearPlata(summary.paidToMe)}</p>
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
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${colorDeAvatar(p.fromUser.id, p.fromUser.avatarColor).bg} ${colorDeAvatar(p.fromUser.id, p.fromUser.avatarColor).text}`}
                    >
                      {iniciales(nombreVisible(p.fromUser))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={filaTitulo}>{nombreVisible(p.fromUser)}</p>
                      <p className={filaSub}>{formatearFecha(p.createdAt)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-vaquita-greenDark">{formatearPlata(p.amount)}</span>
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
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${colorDeAvatar(b.userId, b.avatarColor).bg} ${colorDeAvatar(b.userId, b.avatarColor).text}`}
              >
                {iniciales(b.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className={filaTitulo}>
                  {b.name}
                  {b.userId === user?.id ? " (vos)" : ""}
                </p>
                <p className={filaSub}>
                  Puso {formatearPlata(b.paid)} · Le tocaba {formatearPlata(b.owed)}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-bold ${b.balance >= 0 ? "text-vaquita-greenDark" : "text-red-500"}`}>
                {b.balance >= 0 ? "+" : "-"}
                {formatearPlata(Math.abs(b.balance))}
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
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${colorDeAvatar(p.userId, p.avatarColor).bg} ${colorDeAvatar(p.userId, p.avatarColor).text}`}
                >
                  {iniciales(p.name)}
                </span>
                <p className={`${filaTitulo} flex-1`}>{p.name}</p>
                <span className="shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300">{formatearDuracion(p.totalSeconds)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
