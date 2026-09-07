import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { TripsList } from "./pages/TripsList";
import { TripLayout } from "./components/TripLayout";
import { Dashboard } from "./pages/Dashboard";
import { Expenses } from "./pages/Expenses";
import { Tasks } from "./pages/Tasks";
import { Participants } from "./pages/Participants";
import { AcceptInvite } from "./pages/AcceptInvite";

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
        <Route path="gastos" element={<Expenses />} />
        <Route path="tareas" element={<Tasks />} />
        <Route path="participantes" element={<Participants />} />
      </Route>

      <Route path="*" element={<Navigate to="/trips" replace />} />
    </Routes>
  );
}
