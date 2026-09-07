import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { api } from "../lib/api";
import { Trip, TripSummary } from "../lib/types";
import { avatarColor, displayName, formatMoney, initials } from "../lib/format";
import { InviteModal } from "../components/InviteModal";

export function Participants() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [summary, setSummary] = useState<TripSummary | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    api.getTrip(tripId).then(setTrip);
    api.getSummary(tripId).then(setSummary);
  }, [tripId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="font-semibold text-slate-800">Participantes</h2>
          <p className="text-sm text-slate-500">Invitá a más gente a sumarse a este proyecto.</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 rounded-lg bg-vaquita-green px-4 py-2 text-sm font-semibold text-white hover:bg-vaquita-greenDark"
        >
          <UserPlus size={16} strokeWidth={2} /> Invitar
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Integrantes y saldos</h2>
        <div className="divide-y divide-slate-100">
          {trip?.members.map((m) => {
            const balance = summary?.balances.find((b) => b.userId === m.userId);
            const color = avatarColor(m.userId, m.user.avatarColor);
            return (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${color.bg} ${color.text}`}>
                    {initials(displayName(m.user))}
                  </span>
                  <div>
                    <p className="font-medium text-slate-800">{displayName(m.user)}</p>
                    <p className="text-xs text-slate-400">{m.role === "ORGANIZER" ? "Organizador/a" : "Integrante"}</p>
                  </div>
                </div>
                {balance && (
                  <div className="text-right text-sm">
                    <p className={balance.balance >= 0 ? "font-semibold text-vaquita-greenDark" : "font-semibold text-red-500"}>
                      {balance.balance >= 0 ? "+" : "-"} {formatMoney(Math.abs(balance.balance))}
                    </p>
                    <p className="text-xs text-slate-400">
                      Pagó {formatMoney(balance.paid)} · Debe {formatMoney(balance.owed)}
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">Para saldar cuentas</h2>
          <ul className="space-y-2 text-sm">
            {summary.settlements.map((s, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>
                  <strong>{s.fromName}</strong> le debe a <strong>{s.toName}</strong>
                </span>
                <span className="font-semibold text-slate-800">{formatMoney(s.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showInvite && tripId && <InviteModal tripId={tripId} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
