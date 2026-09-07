import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Logo } from "../components/Logo";

export const PENDING_INVITE_KEY = "la-vaquita-pending-invite";

export function AcceptInvite() {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !token) return;

    if (!user) {
      localStorage.setItem(PENDING_INVITE_KEY, token);
      navigate("/login");
      return;
    }

    api
      .acceptInvitation(token)
      .then(({ tripId }) => {
        localStorage.removeItem(PENDING_INVITE_KEY);
        navigate(`/trips/${tripId}`);
      })
      .catch((e: any) => setError(e.message));
  }, [user, loading, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f3ee] px-4">
      <div className="flex max-w-sm flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Logo size={40} />
        {error ? (
          <>
            <p className="mt-3 font-semibold text-red-500">No se pudo aceptar la invitación</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Uniéndote al proyecto...</p>
        )}
      </div>
    </div>
  );
}
