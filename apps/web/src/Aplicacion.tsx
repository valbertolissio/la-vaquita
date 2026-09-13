import { Navigate, Route, Routes } from "react-router-dom";
import { useSesion } from "./Contexto/ContextoDeSesion";
import { Ingreso } from "./Vista/Ingreso";
import { Registro } from "./Vista/Registro";
import { OlvideContrasena } from "./Vista/OlvideContrasena";
import { RestablecerContrasena } from "./Vista/RestablecerContrasena";
import { ListaDeProyectos } from "./Vista/ListaDeProyectos";
import { MarcoDelProyecto } from "./Componentes/MarcoDelProyecto";
import { Panel } from "./Vista/Panel";
import { Resumen } from "./Vista/Resumen";
import { Gastos } from "./Vista/Gastos";
import { Tareas } from "./Vista/Tareas";
import { Participantes } from "./Vista/Participantes";
import { AceptarInvitacion } from "./Vista/AceptarInvitacion";

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useSesion();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function Aplicacion() {
  return (
    <Routes>
      <Route path="/login" element={<Ingreso />} />
      <Route path="/register" element={<Registro />} />
      <Route path="/forgot-password" element={<OlvideContrasena />} />
      <Route path="/reset-password/:token" element={<RestablecerContrasena />} />
      <Route path="/invite/:token" element={<AceptarInvitacion />} />

      <Route
        path="/trips"
        element={
          <PrivateRoute>
            <ListaDeProyectos />
          </PrivateRoute>
        }
      />

      <Route
        path="/trips/:tripId"
        element={
          <PrivateRoute>
            <MarcoDelProyecto />
          </PrivateRoute>
        }
      >
        <Route index element={<Panel />} />
        <Route path="resumen" element={<Resumen />} />
        <Route path="gastos" element={<Gastos />} />
        <Route path="tareas" element={<Tareas />} />
        <Route path="participantes" element={<Participantes />} />
      </Route>

      <Route path="*" element={<Navigate to="/trips" replace />} />
    </Routes>
  );
}
