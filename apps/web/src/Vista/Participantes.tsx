import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, UserPlus } from "lucide-react";
import { api } from "../Utilidades/api";
import { Proyecto, ResumenDelProyecto } from "../Utilidades/tipos";
import { colorDeAvatar, nombreVisible, formatearPlata, iniciales } from "../Utilidades/formato";
import { useActualizacionAutomatica } from "../Utilidades/useActualizacionAutomatica";
import { useSesion } from "../Contexto/ContextoDeSesion";
import { ModalInvitar } from "../Componentes/ModalInvitar";

export function Participantes() {
  const { tripId } = useParams();
  const { user } = useSesion();
  const [trip, setTrip] = useState<Proyecto | null>(null);
  const [summary, setSummary] = useState<ResumenDelProyecto | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  function reload() {
    if (!tripId) return;
    api.obtenerProyecto(tripId).then(setTrip);
    api.obtenerResumen(tripId).then(setSummary);
  }

  useEffect(reload, [tripId]);
  useActualizacionAutomatica(reload, [tripId]);

  async function markSettlementPaid(index: number) {
    const s = summary?.settlements[index];
    if (!tripId || !s) return;
    setMarkingId(index);
    try {
      await api.crearPago(tripId, { fromUserId: s.fromUserId, toUserId: s.toUserId, amount: s.amount });
      reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Participantes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Invitá a más gente a sumarse a este proyecto.</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 rounded-lg bg-vaquita-green px-4 py-2 text-sm font-semibold text-white hover:bg-vaquita-greenDark"
        >
          <UserPlus size={16} strokeWidth={2} /> Invitar
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Integrantes y saldos</h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {trip?.members.map((m) => {
            const balance = summary?.balances.find((b) => b.userId === m.userId);
            const color = colorDeAvatar(m.userId, m.user.avatarColor);
            return (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${color.bg} ${color.text}`}>
                    {iniciales(nombreVisible(m.user))}
                  </span>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{nombreVisible(m.user)}</p>
                    <p className="text-xs text-slate-400">{m.role === "ORGANIZER" ? "Organizador/a" : "Integrante"}</p>
                  </div>
                </div>
                {balance && (
                  <div className="text-right text-sm">
                    <p className={balance.balance >= 0 ? "font-semibold text-vaquita-greenDark" : "font-semibold text-red-500"}>
                      {balance.balance >= 0 ? "+" : "-"} {formatearPlata(Math.abs(balance.balance))}
                    </p>
                    <p className="text-xs text-slate-400">
                      Pagó {formatearPlata(balance.paid)} · Debe {formatearPlata(balance.owed)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          {trip && trip.members.length === 0 && <p className="py-3 text-sm text-slate-400">Todavía no hay participantes.</p>}
        </div>
      </div>

      {summary && summary.settlements.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">Para saldar cuentas</h2>
          <ul className="space-y-2 text-sm">
            {summary.settlements.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
                <span>
                  <strong>{s.fromName}</strong> le debe a <strong>{s.toName}</strong>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{formatearPlata(s.amount)}</span>
                  {(s.fromUserId === user?.id || s.toUserId === user?.id) && (
                    <button
                      onClick={() => markSettlementPaid(i)}
                      disabled={markingId === i}
                      title="Marcar como pagado"
                      className="flex items-center gap-1 rounded-full border border-vaquita-green/40 px-2 py-1 text-xs font-medium text-vaquita-greenDark hover:bg-vaquita-green/10 disabled:opacity-60"
                    >
                      <Check size={12} strokeWidth={2.5} />
                      {markingId === i ? "..." : "Pagado"}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showInvite && tripId && <ModalInvitar tripId={tripId} tripName={trip?.name} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
