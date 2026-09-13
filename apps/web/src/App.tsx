import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./Contexto/AuthContext";
import { Login } from "./Vista/Login";
import { Register } from "./Vista/Register";
import { ForgotPassword } from "./Vista/ForgotPassword";
import { ResetPassword } from "./Vista/ResetPassword";
import { TripsList } from "./Vista/TripsList";
import { TripLayout } from "./Componentes/TripLayout";
import { Dashboard } from "./Vista/Dashboard";
import { Resumen } from "./Vista/Resumen";
import { Expenses } from "./Vista/Expenses";
import { Tasks } from "./Vista/Tasks";
import { Participants } from "./Vista/Participants";
import { AcceptInvite } from "./Vista/AcceptInvite";

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/invite/:token" element={<AcceptInvite />} />

      <Route
        path="/trips"
        element={
          <PrivateRoute>
            <TripsList />
          </PrivateRoute>
        }
      />

      <Route
        path="/trips/:tripId"
        element={
          <PrivateRoute>
            <TripLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="resumen" element={<Resumen />} />
        <Route path="gastos" element={<Expenses />} />
        <Route path="tareas" element={<Tasks />} />
        <Route path="participantes" element={<Participants />} />
      </Route>

      <Route path="*" element={<Navigate to="/trips" replace />} />
    </Routes>
  );
}
