import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../Utilidades/api";
import { Logo } from "../Componentes/Logo";
import { ThemeToggle } from "../Componentes/ThemeToggle";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.forgotPassword(email);
      setMessage(result.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-navy-900 px-4">
      <ThemeToggle variant="onNavy" className="absolute right-4 top-4" />
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-800">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={44} />
          <h1 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-slate-100">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Te mandamos un link para elegir una nueva.</p>
        </div>
        {message ? (
          <p className="rounded-lg bg-vaquita-green/10 px-3 py-2 text-sm text-vaquita-greenDark">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-vaquita-green py-2.5 text-sm font-semibold text-white hover:bg-vaquita-greenDark disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Mandar link"}
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
