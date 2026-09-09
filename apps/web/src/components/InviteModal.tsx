import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";

interface Props {
  tripId: string;
  onClose: () => void;
}

export function InviteModal({ tripId, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    setError(null);
    if (!email) {
      setError("Ingresá un email.");
      return;
    }
    setSubmitting(true);
    try {
      const invitation = await api.inviteMember(tripId, email);
      setLink(`${window.location.origin}/invite/${invitation.token}`);
      setEmailSent(!!invitation.emailSent);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Invitar participante</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {!link ? (
          <>
            <label className="text-xs font-medium text-slate-500">Email de la persona a invitar</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@ejemplo.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            <button
              onClick={handleInvite}
              disabled={submitting}
              className="mt-4 w-full rounded-lg bg-vaquita-green py-2.5 text-sm font-semibold text-white hover:bg-vaquita-greenDark disabled:opacity-60"
            >
              {submitting ? "Generando invitación..." : "Generar invitación"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              {emailSent ? (
                <>
                  Le mandamos un email a <strong>{email}</strong> con la invitación. También podés compartirle este link
                  directamente (WhatsApp, mensaje, etc.):
                </>
              ) : (
                <>
                  Invitación creada para <strong>{email}</strong>, pero no pudimos mandar el email automáticamente —
                  compartile este link directamente (WhatsApp, mensaje, etc.):
                </>
              )}
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="flex-1 truncate">{link}</span>
              <button
                onClick={copyLink}
                className="shrink-0 rounded-md bg-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-300"
              >
                {copied ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Listo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
