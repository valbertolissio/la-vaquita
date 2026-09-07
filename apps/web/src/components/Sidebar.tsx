import { NavLink, useNavigate, useParams } from "react-router-dom";
import { LayoutDashboard, Wallet, ClipboardList, Users, Plane, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";

const links = [
  { to: "", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "gastos", label: "Gastos", icon: Wallet },
  { to: "tareas", label: "Tareas", icon: ClipboardList },
  { to: "participantes", label: "Participantes", icon: Users },
];

export function Sidebar() {
  const { tripId } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-navy-900 text-white">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
          <Logo size={24} />
        </div>
        <div>
          <p className="font-display text-lg font-bold leading-none">La Vaquita</p>
          <p className="text-xs text-white/60">Menos cuentas. Más viaje.</p>
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3">
        {links.map((link) => (
          <NavLink
            key={link.label}
            to={`/trips/${tripId}/${link.to}`}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-vaquita-green text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <link.icon size={18} strokeWidth={2} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        <button
          onClick={() => navigate("/trips")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
        >
          <Plane size={18} strokeWidth={2} /> Viajes
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} strokeWidth={2} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
