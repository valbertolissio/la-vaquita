import { NavLink, useNavigate, useParams } from "react-router-dom";
import { LayoutDashboard, Wallet, ClipboardList, Users, Plane, LogOut } from "lucide-react";
import { useSesion } from "../Contexto/ContextoDeSesion";
import { Logo } from "./Logo";
import { BotonDeTema } from "./BotonDeTema";

const links = [
  { to: "", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "gastos", label: "Gastos", icon: Wallet },
  { to: "tareas", label: "Tareas", icon: ClipboardList },
  { to: "participantes", label: "Participantes", icon: Users },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function BarraLateral({ open = false, onClose }: SidebarProps) {
  const { tripId } = useParams();
  const { logout } = useSesion();
  const navigate = useNavigate();

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto bg-navy-900 text-white transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
            <Logo size={24} />
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-none">La Vaquita</p>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {links.map((link) => (
            <NavLink
              key={link.label}
              to={`/trips/${tripId}/${link.to}`}
              end={link.end}
              onClick={onClose}
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
            onClick={() => {
              onClose?.();
              navigate("/trips");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
          >
            <Plane size={18} strokeWidth={2} /> Proyectos
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
            >
              <LogOut size={18} strokeWidth={2} /> Cerrar sesión
            </button>
            <BotonDeTema variant="onNavy" />
          </div>
        </div>
      </aside>
    </>
  );
}
