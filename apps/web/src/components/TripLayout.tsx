import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Pencil, UserPlus, MoreHorizontal } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { api } from "../lib/api";
import { Trip } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { avatarColor, displayName, initials } from "../lib/format";
import { InviteModal } from "./InviteModal";
import { EditTripModal } from "./EditTripModal";
import { EditProfileModal } from "./EditProfileModal";

export function TripLayout() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (tripId) api.getTrip(tripId).then(setTrip);
  }, [tripId]);

  const myRole = trip?.members.find((m) => m.userId === user?.id)?.role;
  const isOrganizer = myRole === "ORGANIZER";

  async function handleDelete() {
    if (!tripId) return;
    if (!confirm(`¿Seguro que querés eliminar "${trip?.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await api.deleteTrip(tripId);
      navigate("/trips");
    } catch (e: any) {
      alert(e.message);
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f3ee]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              {trip?.name ?? "Cargando..."}
              {isOrganizer && (
                <button onClick={() => setShowEdit(true)} className="text-slate-400 hover:text-slate-600">
                  <Pencil size={16} strokeWidth={2} />
                </button>
              )}
            </h1>
            {trip && (
              <p className="text-sm text-slate-500">
                {new Date(trip.startDate).toLocaleDateString("es-AR", { day: "2-digit", month: "long" })} -{" "}
                {new Date(trip.endDate).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
                {" · "}
                {trip.members.length} participantes
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <UserPlus size={16} strokeWidth={2} /> Invitar
            </button>

            <div className="relative">
              <button
                onClick={() => setShowOptions((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <MoreHorizontal size={16} strokeWidth={2} /> Opciones
              </button>
              {showOptions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    <button
                      onClick={() => {
                        setShowOptions(false);
                        setShowInvite(true);
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Invitar participante
                    </button>
                    {isOrganizer && (
                      <button
                        onClick={() => {
                          setShowOptions(false);
                          setShowEdit(true);
                        }}
                        className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Editar proyecto
                      </button>
                    )}
                    {isOrganizer && (
                      <button
                        onClick={() => {
                          setShowOptions(false);
                          handleDelete();
                        }}
                        disabled={deleting}
                        className="block w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deleting ? "Eliminando..." : "Eliminar proyecto"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  user ? `${avatarColor(user.id, user.avatarColor).bg} ${avatarColor(user.id, user.avatarColor).text}` : "bg-vaquita-green text-white"
                }`}
              >
                {user ? initials(displayName(user)) : "?"}
              </span>
              {user ? displayName(user) : ""}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet context={{ trip }} />
        </main>
      </div>

      {showInvite && tripId && <InviteModal tripId={tripId} onClose={() => setShowInvite(false)} />}
      {showEdit && trip && <EditTripModal trip={trip} onClose={() => setShowEdit(false)} onUpdated={setTrip} />}
      {showProfile && <EditProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}
