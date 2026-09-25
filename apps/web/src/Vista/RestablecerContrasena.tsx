import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../Utilidades/api";
import { Logo } from "../Componentes/Logo";
import { BotonDeTema } from "../Componentes/BotonDeTema";

export function RestablecerContrasena() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await api.restablecerContrasena({ token: token!, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-navy-900 px-4">
      <BotonDeTema variant="onNavy" className="absolute right-4 top-4" />
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-800">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={44} />
          <h1 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-slate-100">Elegir nueva contraseña</h1>
        </div>
        {done ? (
          <p className="rounded-lg bg-vaquita-green/10 px-3 py-2 text-sm text-vaquita-greenDark">
            Contraseña actualizada. Te llevamos a la pantalla de ingreso.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Contraseña nueva"
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
            />
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              placeholder="Confirmar contraseña"
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-vaquita-green py-2.5 text-sm font-semibold text-white hover:bg-vaquita-greenDark disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link to="/login" className="font-medium text-vaquita-greenDark hover:underline">
            Volver a ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
