import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, Pencil, UserPlus } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { api } from "../Utilidades/api";
import { Trip } from "../Utilidades/types";
import { useAuth } from "../Contexto/AuthContext";
import { avatarColor, displayName, initials } from "../Utilidades/format";
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
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (tripId) api.getTrip(tripId).then(setTrip);
  }, [tripId]);

  const myRole = trip?.members.find((m) => m.userId === user?.id)?.role;
  const isOrganizer = myRole === "ORGANIZER";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f3ee] dark:bg-slate-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-8 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 md:hidden"
            >
              <Menu size={22} strokeWidth={2} />
            </button>
            <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate text-xl font-bold text-slate-900 dark:text-slate-100">
              {trip?.name ?? "Cargando..."}
              {isOrganizer && (
                <button onClick={() => setShowEdit(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <Pencil size={16} strokeWidth={2} />
                </button>
              )}
            </h1>
            {trip && (
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                {new Date(trip.startDate).toLocaleDateString("es-AR", { day: "2-digit", month: "long" })} -{" "}
                {new Date(trip.endDate).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
                {" · "}
                {trip.members.length} participantes
              </p>
            )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:px-4 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50"
            >
              <UserPlus size={16} strokeWidth={2} /> <span className="hidden sm:inline">Invitar</span>
            </button>

            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  user ? `${avatarColor(user.id, user.avatarColor).bg} ${avatarColor(user.id, user.avatarColor).text}` : "bg-vaquita-green text-white"
                }`}
              >
                {user ? initials(displayName(user)) : "?"}
              </span>
              <span className="hidden sm:inline">{user ? displayName(user) : ""}</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8">
          <Outlet context={{ trip }} />
        </main>
      </div>

      {showInvite && tripId && <InviteModal tripId={tripId} tripName={trip?.name} onClose={() => setShowInvite(false)} />}
      {showEdit && trip && (
        <EditTripModal
          trip={trip}
          onClose={() => setShowEdit(false)}
          onUpdated={setTrip}
          onDeleted={isOrganizer ? () => navigate("/trips") : undefined}
        />
      )}
      {showProfile && <EditProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}
