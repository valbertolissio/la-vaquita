import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { displayName } from "../lib/format";

export function TripsList() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    api.listTrips().then(setTrips);
  }, []);

  async function createTrip(e: FormEvent) {
    e.preventDefault();
    const trip = await api.createTrip({ name, startDate, endDate });
    navigate(`/trips/${trip.id}`);
  }

  return (
    <div className="min-h-screen bg-[#f5f3ee] px-6 py-10 dark:bg-slate-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">Tus proyectos</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Hola, {user ? displayName(user) : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm((s) => !s)}
              className="flex items-center gap-1.5 rounded-lg bg-vaquita-green px-4 py-2 text-sm font-semibold text-white hover:bg-vaquita-greenDark"
            >
              <Plus size={16} strokeWidth={2.5} /> Nuevo proyecto
            </button>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50"
            >
              Cerrar sesión
            </button>
            <ThemeToggle />
          </div>
        </div>

        {showForm && (
          <form onSubmit={createTrip} className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del proyecto (ej: Bariloche 2025)"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
            />
            <div className="flex gap-3">
              <input
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                type="date"
                required
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              />
              <input
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                type="date"
                required
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
              />
            </div>
            <button type="submit" className="rounded-lg bg-vaquita-green px-4 py-2 text-sm font-semibold text-white hover:bg-vaquita-greenDark">
              Crear proyecto
            </button>
          </form>
        )}

        <div className="grid grid-cols-2 gap-4">
          {trips === null && <p className="text-sm text-slate-400">Cargando tus proyectos...</p>}
          {trips?.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/trips/${t.id}`)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-vaquita-green dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="font-semibold text-slate-800 dark:text-slate-100">{t.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {new Date(t.startDate).toLocaleDateString("es-AR")} - {new Date(t.endDate).toLocaleDateString("es-AR")}
              </p>
              <p className="mt-1 text-xs text-slate-400">{t.members.length} participantes</p>
            </button>
          ))}
          {trips?.length === 0 && !showForm && (
            <p className="text-sm text-slate-400">Todavía no creaste ningún proyecto. ¡Arrancá con "+ Nuevo proyecto"!</p>
          )}
        </div>
      </div>
    </div>
  );
}
